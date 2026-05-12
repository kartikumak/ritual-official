'use client';

import { motion } from "framer-motion";
import { Search, ShoppingBag, Star, BookOpen, ChevronLeft, Filter, Zap, Download, ShoppingCart, Tag, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { getSupabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { cn } from "@/src/lib/utils";

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
        const anchorsToInsert = anchors.map(a => ({
          deck_id: newDeck.id,
          word: a.word,
          hint: a.hint,
          level: a.level,
          keywords: a.keywords,
          reference_answer: a.reference_answer
        }));

        await supabase.from('anchors').insert(anchorsToInsert);
      }

      alert("Collection anchored to your rituals!");
      router.push('/');
    } catch (err: any) {
      alert("Import failed: " + err.message);
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
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[140px] animate-blob" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/5 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '5s' }} />
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-10 md:py-16 pb-32 relative z-10">
        {/* Search Header */}
        <div className="space-y-8 md:space-y-12 mb-12 md:mb-16">
          <header className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
            <button 
              onClick={() => router.push('/')} 
              className="w-14 h-14 rounded-[1.8rem] bg-card shadow-neumorphic flex items-center justify-center text-muted-foreground hover:text-primary transition-all border border-white/5 active:scale-95 shrink-0"
            >
              <ChevronLeft size={28} />
            </button>
            <div className="space-y-1 sm:space-y-2">
              <h1 className="text-4xl md:text-5xl font-serif font-black tracking-tight leading-none">Ritual Library</h1>
              <p className="text-[10px] font-black tracking-[0.2em] uppercase text-muted-foreground/40">Acquire and anchor community wisdom</p>
            </div>
          </header>

          <div className="relative group max-w-2xl">
            <div className="absolute inset-y-0 left-8 flex items-center pointer-events-none text-muted-foreground/30 group-focus-within:text-primary transition-colors">
              <Search size={22} />
            </div>
            <input 
              type="text"
              placeholder="Discover domains, languages, or deep concepts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-20 bg-card shadow-neumorphic border border-white/5 rounded-[2.5rem] pl-20 pr-8 text-lg font-bold focus:ring-8 focus:ring-primary/5 outline-none transition-all placeholder:text-muted-foreground/10"
            />
          </div>

          <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-8 py-3.5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.15em] whitespace-nowrap transition-all shadow-neumorphic border border-white/5 active:scale-95",
                  selectedCategory === cat ? "bg-primary text-white shadow-glow" : "bg-card text-muted-foreground hover:text-primary"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8 md:gap-10">
             {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
               <div key={i} className="h-[420px] rounded-[3.5rem] bg-card border border-white/5 shadow-neumorphic animate-pulse" />
             ))}
          </div>
        ) : filteredDecks.length === 0 ? (
          <div className="text-center py-40 p-8 sm:p-12 rounded-[4rem] bg-card border border-white/5 shadow-neumorphic">
             <div className="w-24 h-24 rounded-[2.5rem] bg-white/5 flex items-center justify-center mx-auto mb-8 border border-white/5">
               <ShoppingBag size={48} className="text-muted-foreground/20" />
             </div>
             <h3 className="text-3xl font-serif font-black mb-4">No Rituals Manifested</h3>
             <p className="text-[10px] font-black tracking-[0.2em] uppercase text-muted-foreground/30">Your search currently exists in a void.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8 md:gap-10">
            {filteredDecks.map((deck, i) => (
              <motion.div 
                key={deck.id}
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.6 }}
                className="p-8 sm:p-10 rounded-[3.5rem] bg-card border border-white/5 shadow-neumorphic group relative overflow-hidden flex flex-col h-[420px] hover:scale-[1.02] transition-all cursor-pointer"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/20 transition-colors" />
                
                <div className="mb-8 flex-1">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                      <Zap size={18} fill="currentColor" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">{deck.category || 'General'}</span>
                  </div>
                  
                  <h3 className="text-3xl font-serif font-black text-foreground group-hover:text-primary transition-colors leading-[0.95] tracking-tighter mb-4 line-clamp-2">
                    {deck.name}
                  </h3>
                  
                  <p className="text-xs font-bold text-muted-foreground/40 leading-relaxed line-clamp-3">
                    {deck.description || "Synthesize this domain of knowledge through structured anchoring rituals."}
                  </p>
                </div>

                <div className="space-y-8">
                  {/* Author Meta */}
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 shadow-inner flex items-center justify-center border border-white/5 overflow-hidden">
                       {deck.profiles?.avatar_url ? (
                         <img src={deck.profiles.avatar_url} className="w-full h-full object-cover" />
                       ) : (
                         <User size={18} className="text-muted-foreground/30" />
                       )}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.1em]">Origin</p>
                      <p className="text-[11px] font-black text-foreground uppercase tracking-wider">{deck.profiles?.name || "Independent Soul"}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-white/5">
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground/30 tracking-widest mb-1">Energy Value</p>
                      <p className="text-xl font-black text-foreground">
                        {deck.price > 0 ? `$${deck.price}` : "Free"}
                      </p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImport(deck);
                      }}
                      className="px-6 py-3 rounded-full bg-foreground text-card text-[10px] font-black tracking-widest shadow-glow hover:bg-primary hover:shadow-glow active:scale-95 transition-all flex items-center gap-2"
                    >
                      <ShoppingCart size={12} />
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
