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
    <div className="max-w-6xl mx-auto px-6 py-12 pb-32">
      {/* Search Header */}
      <div className="space-y-10 mb-12">
        <header className="flex items-center gap-6">
          <button onClick={() => router.push('/')} className="w-12 h-12 rounded-2xl bg-white shadow-neumorphic flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-4xl font-serif font-black tracking-tight">Marketplace</h1>
            <p className="text-sm font-semibold text-muted-foreground opacity-60">Expand your mind with community rituals.</p>
          </div>
        </header>

        <div className="relative group">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
            <Search size={20} />
          </div>
          <input 
            type="text"
            placeholder="Search for domains, languages, or concepts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-16 bg-white shadow-neumorphic border border-white/60 rounded-[1.5rem] pl-16 pr-6 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/30"
          />
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all shadow-sm",
                selectedCategory === cat ? "bg-foreground text-white" : "bg-white text-muted-foreground hover:bg-primary/5 active:scale-95"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {[1, 2, 3, 4, 5, 6].map(i => (
             <div key={i} className="h-64 rounded-[3rem] bg-white border border-white/60 shadow-neumorphic animate-pulse" />
           ))}
        </div>
      ) : filteredDecks.length === 0 ? (
        <div className="text-center py-32 p-10 rounded-[3.5rem] bg-white border border-white/60 shadow-neumorphic">
           <ShoppingBag size={64} className="mx-auto text-primary/20 mb-6" />
           <h3 className="text-2xl font-serif font-black mb-2">No Rituals Found</h3>
           <p className="text-sm font-semibold text-muted-foreground opacity-60">Try a different keyword or category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDecks.map((deck, i) => (
            <motion.div 
              key={deck.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="p-8 rounded-[3rem] bg-white border border-white/60 shadow-neumorphic group relative overflow-hidden flex flex-col h-full"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="px-3 py-1 bg-accent text-white text-[9px] font-black rounded-full uppercase">
                  Featured
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Tag size={12} className="text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">{deck.category || 'General'}</span>
                </div>
                <h3 className="text-2xl font-serif font-black text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-2">{deck.name}</h3>
                <p className="text-xs font-semibold text-muted-foreground leading-relaxed line-clamp-2 min-h-[32px]">
                  {deck.description || "A deep conceptual exploration of this knowledge domain."}
                </p>
              </div>

              {/* Author Info */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-full border border-border overflow-hidden bg-muted/20">
                   {deck.profiles?.avatar_url ? (
                     <img src={deck.profiles.avatar_url} className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-muted-foreground">
                        <User size={14} />
                     </div>
                   )}
                </div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{deck.profiles?.name || "Independent Soul"}</p>
              </div>

              <div className="mt-auto pt-6 border-t border-muted/50 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-wider">Access</p>
                  <p className="text-lg font-black text-foreground">
                    {deck.price > 0 ? `$${deck.price}` : "Free Store"}
                  </p>
                </div>
                <button 
                  onClick={() => handleImport(deck)}
                  className="px-6 py-3 rounded-full bg-foreground text-white text-[10px] font-black tracking-widest shadow-lg hover:bg-primary hover:shadow-glow active:scale-95 transition-all flex items-center gap-2"
                >
                  <ShoppingCart size={12} />
                  {deck.price > 0 ? "UNLOCK" : "ANCHOR"}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
