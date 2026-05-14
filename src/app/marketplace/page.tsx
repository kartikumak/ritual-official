'use client';

import { motion } from "framer-motion";
import { Search, ShoppingBag, Star, BookOpen, ChevronLeft, Filter, Zap, Download, ShoppingCart, Tag, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { getSupabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { cn } from "@/src/lib/utils";
import { toast } from "sonner";

export default function MarketplacePage() {
  const { user, loading: authLoading } = useAuth();
  const [decks, setDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const supabase = getSupabase();
  const router = useRouter();

  const categories = ["All", "Science", "Languages", "Medical", "Tech", "Arts", "Business"];

  useEffect(() => {
    fetchPublicDecks();
  }, []);

  const fetchPublicDecks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('decks')
      .select('*, profiles(name, avatar_url), anchors(count)')
      .eq('is_public', true);
    
    if (!error) {
      setDecks(data || []);
    }
    setLoading(false);
  };

  const handleImport = async (publicDeck: any) => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      // 1. Create a copy of the deck for the current user
      const { data: newDeck, error: dErr } = await supabase
        .from('decks')
        .insert({
          user_id: user.id,
          name: `${publicDeck.name} (Imported)`,
          description: publicDeck.description,
          is_public: false,
          category: publicDeck.category
        })
        .select()
        .single();

      if (dErr) throw dErr;

      // 2. Fetch anchors from the public deck
      const { data: anchors, error: aErr } = await supabase
        .from('anchors')
        .select('*')
        .eq('deck_id', publicDeck.id);

      if (aErr) throw aErr;

      // 3. Insert them into the new deck
      if (anchors && anchors.length > 0) {
        const anchorsToInsert = anchors.map((a: any) => ({
          deck_id: newDeck.id,
          word: a.word,
          hint: a.hint,
          level: a.level,
          keywords: a.keywords,
          reference_answer: a.reference_answer
        }));

        await supabase.from('anchors').insert(anchorsToInsert);
      }

      toast.success("Collection anchored to your study space!");
      router.push('/');
    } catch (err: any) {
      toast.error("Import failed: " + err.message);
    }
  };

  const filteredDecks = decks.filter(d => 
    (selectedCategory === "All" || d.category === selectedCategory) &&
    (d.name.toLowerCase().includes(search.toLowerCase()) || d.description?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Background Blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[140px] animate-fadeIn" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary-lighter/10 rounded-full blur-[100px] animate-fadeIn" style={{ animationDelay: '5s' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 md:py-16 pb-32 relative z-10">
        {/* Search Header */}
        <div className="space-y-8 md:space-y-12 mb-12 md:mb-16">
          <header className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
            <button 
              onClick={() => router.push('/')} 
              className="w-12 h-12 rounded-[--radius-md] bg-card shadow-[--shadow-sm] border border-border flex items-center justify-center text-muted hover:text-primary transition-all active:scale-95 shrink-0"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="space-y-1 sm:space-y-2">
              <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight leading-none text-foreground">Ritual Library</h1>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted">Acquire and anchor community wisdom</p>
            </div>
          </header>

          <div className="relative group max-w-2xl">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-muted transition-colors group-focus-within:text-primary">
              <Search size={20} />
            </div>
            <input 
              type="text"
              placeholder="Discover domains, languages, or deep concepts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-16 bg-card shadow-[--shadow-sm] border border-border rounded-[--radius-lg] pl-16 pr-8 text-base font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary-lighter transition-all placeholder:text-muted/40"
            />
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-6 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap transition-all border active:scale-95",
                  selectedCategory === cat 
                    ? "bg-primary text-white border-primary shadow-[--shadow-glow-purple]" 
                    : "bg-card text-muted border-border hover:border-primary hover:text-primary"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
               <div key={i} className="h-[400px] rounded-[--radius-xl] bg-card border border-border shadow-[--shadow-sm] animate-pulse" />
             ))}
          </div>
        ) : filteredDecks.length === 0 ? (
          <div className="text-center py-32 px-8 rounded-[--radius-xl] bg-card border border-border shadow-[--shadow-sm]">
             <div className="w-20 h-20 rounded-full bg-muted-bg flex items-center justify-center mx-auto mb-6">
               <ShoppingBag size={40} className="text-muted/30" />
             </div>
             <h3 className="text-2xl font-serif font-bold mb-2">No Concepts Manifested</h3>
             <p className="text-xs font-medium text-muted uppercase tracking-widest">Your search currently exists in a void.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDecks.map((deck, i) => (
              <motion.div 
                key={deck.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card-md group relative overflow-hidden flex flex-col h-[400px] hover:shadow-[--shadow-lg] transition-all cursor-pointer"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors" />
                
                <div className="mb-6 flex-1">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary-lighter flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      <Zap size={16} fill="currentColor" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70">{deck.category || 'General'}</span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors leading-tight tracking-tight mb-3 line-clamp-2">
                    {deck.name}
                  </h3>
                  
                  <p className="text-xs text-muted leading-relaxed line-clamp-4">
                    {deck.description || "Synthesize this domain of knowledge through structured anchoring sessions."}
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Author Meta */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted-bg flex items-center justify-center border border-border overflow-hidden">
                       {deck.profiles?.avatar_url ? (
                         <img src={deck.profiles.avatar_url} className="w-full h-full object-cover" />
                       ) : (
                         <User size={16} className="text-muted/40" />
                       )}
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-muted uppercase tracking-tight">Origin</p>
                      <p className="text-[11px] font-bold text-foreground">{deck.profiles?.name || "Independent Soul"}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-5 border-t border-border">
                    <div>
                      <p className="text-[9px] font-bold uppercase text-muted tracking-widest mb-0.5">Value</p>
                      <p className="text-lg font-bold text-foreground">
                        {deck.price > 0 ? `$${deck.price}` : "Free"}
                      </p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImport(deck);
                      }}
                      className="btn-primary px-5 py-2.5 text-[10px] font-bold tracking-widest uppercase flex items-center gap-2"
                    >
                      <ShoppingCart size={14} />
                      {deck.price > 0 ? "UNLOCK" : "ANCHOR"}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
