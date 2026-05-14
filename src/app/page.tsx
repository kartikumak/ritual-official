'use client';

import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, User, Plus, Trash2, ArrowRight, Activity, Zap, Mic } from "lucide-react";
import { useState, useEffect } from "react";
import { cn, getInitials } from "@/src/lib/utils";
import { useAuth } from "@/src/context/AuthContext";
import { getSupabase } from "@/src/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/src/components/ThemeToggle";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [decks, setDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDeckModal, setShowNewDeckModal] = useState(false);
  const [newDeck, setNewDeck] = useState({ name: '', description: '', category: 'General' });
  const [stats, setStats] = useState({ total: 0, weekly: 0 });

  const supabase = getSupabase();
  const router = useRouter();

  useEffect(() => {
    if (user && !authLoading) {
      fetchData();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!profileData) {
        const { data: newProfile } = await supabase.from('profiles').insert({
          id: user.id, email: user.email, name: user.user_metadata?.name || user.email?.split('@')[0] || 'Explorer'
        }).select().single();
        profileData = newProfile;
      }
      if (profileData) setProfile(profileData);

      const { data: decksData } = await supabase.from('decks').select('*, anchors(id)').eq('user_id', user.id);
      setDecks(decksData?.map(d => ({ ...d, anchorCount: d.anchors?.length || 0 })) || []);

      const { data: logs } = await supabase.from('review_logs').select('reviewed_at').eq('user_id', user.id);
      if (logs) {
        setStats({ 
          total: logs.length, 
          weekly: logs.filter(l => new Date(l.reviewed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length 
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeck = async () => {
    if (!newDeck.name || !user) return;
    const { error } = await supabase.from('decks').insert({
      user_id: user.id, name: newDeck.name, description: newDeck.description, category: newDeck.category, is_public: false
    });
    if (!error) {
      setShowNewDeckModal(false);
      setNewDeck({ name: '', description: '', category: 'General' });
      fetchData();
    }
  };

  const deleteDeck = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(confirm("Are you sure you want to delete this deck?")) {
      await supabase.from('decks').delete().eq('id', id);
      fetchData();
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // --- GET STARTED (Logged Out) ---
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden px-6">
        {/* Abstract floating shapes */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] animate-pulse-soft mix-blend-multiply dark:mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-cyan/10 rounded-full blur-[100px] animate-pulse-soft mix-blend-multiply dark:mix-blend-screen" style={{ animationDelay: '2s' }} />
        
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: "easeOut" }} className="z-10 text-center max-w-lg mb-16">
          <div className="w-24 h-24 mx-auto bg-card shadow-lg rounded-[2rem] flex items-center justify-center mb-8 border border-white/10">
             <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-accent-cyan flex shadow-glow-purple" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-normal text-foreground leading-tight tracking-tight mb-4">
            Welcome to inLucid
          </h1>
          <p className="text-base font-medium text-muted mb-10 max-w-sm mx-auto">
            A modern space for reflection, active recall, and deep concept understanding.
          </p>
          <Link href="/login" className="bg-foreground text-background px-8 py-4 rounded-full font-bold text-sm tracking-wide inline-flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 shadow-xl">
             Get Started <ArrowRight size={18} />
          </Link>
        </motion.div>
      </div>
    );
  }

  // --- DASHBOARD (Logged In) ---
  return (
    <div className="min-h-screen bg-background relative pb-24">
      {/* Soft background glows */}
      <div className="fixed top-0 inset-x-0 h-96 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <main className="max-w-3xl mx-auto px-6 pt-16 relative">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <p className="text-xs font-bold uppercase tracking-widest text-muted mb-1 flex items-center gap-2">
              <Zap size={14} className="text-accent-yellow" /> Activity Pulse
            </p>
            <h1 className="text-3xl font-serif text-foreground">Hi, {profile?.name || "Learner"}</h1>
          </motion.div>
          <div className="flex items-center gap-4">
            <ThemeToggle className="w-12 h-12 rounded-full shadow-sm" />
            <Link href="/profile" className="w-12 h-12 rounded-full border-2 border-primary/20 p-0.5 overflow-hidden transition-all hover:border-primary shadow-sm">
               {profile?.avatar_url ? (
                 <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
               ) : (
                 <div className="w-full h-full bg-primary-lighter text-primary flex items-center justify-center font-bold text-lg rounded-full">
                   {getInitials(profile?.name || "?")}
                 </div>
               )}
            </Link>
          </div>
        </header>

        {/* Progress Overview */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 gap-4 mb-12">
           <div className="bg-card rounded-[2rem] p-6 shadow-sm border border-border/50 relative overflow-hidden group">
             <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-primary/5 rounded-full group-hover:bg-primary/10 transition-colors" />
             <p className="text-xs font-bold uppercase text-muted tracking-wider mb-2">Total Recalls</p>
             <p className="text-4xl font-bold text-primary">{stats.total}</p>
           </div>
           <div className="bg-card rounded-[2rem] p-6 shadow-sm border border-border/50 relative overflow-hidden group">
             <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-accent-cyan/5 rounded-full group-hover:bg-accent-cyan/10 transition-colors" />
             <p className="text-xs font-bold uppercase text-muted tracking-wider mb-2">This Week</p>
             <p className="text-4xl font-bold text-accent-cyan">{stats.weekly}</p>
           </div>
        </motion.div>

        {/* Learning Decks */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex justify-between items-end mb-6">
           <h2 className="text-xl font-bold text-foreground">My Concepts</h2>
           <button onClick={() => setShowNewDeckModal(true)} className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-glow-purple hover:scale-105 transition-transform">
             <Plus size={20} />
           </button>
        </motion.div>

        <div className="space-y-4">
          <AnimatePresence>
            {decks.map((deck) => (
              <motion.div 
                key={deck.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card hover:bg-card/80 rounded-[2rem] p-6 shadow-sm border border-border/50 transition-all group flex items-center justify-between"
              >
                <div className="flex-1 pr-4" onClick={() => router.push(`/deck/${deck.id}`)} style={{ cursor: 'pointer' }}>
                  <h3 className="text-lg font-bold text-foreground mb-1">{deck.name}</h3>
                  <p className="text-sm text-muted line-clamp-1">{deck.description || "A collection of concepts to reflect on."}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="badge-primary px-3 py-1 font-medium bg-primary/10 text-primary">
                      {deck.anchorCount} concepts
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <button onClick={(e) => deleteDeck(deck.id, e)} className="text-muted/40 hover:text-accent-pink transition-colors p-2">
                    <Trash2 size={18} />
                  </button>
                  <Link href={`/deck/${deck.id}`} className="w-12 h-12 rounded-full bg-secondary text-foreground flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                    <ArrowRight size={20} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {decks.length === 0 && (
            <div className="bg-secondary/50 rounded-[2rem] p-10 text-center border border-dashed border-border flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-card shadow-sm flex items-center justify-center mb-4 text-muted">
                <BookOpen size={24} />
              </div>
              <p className="text-foreground font-bold">No concepts yet</p>
              <p className="text-sm text-muted mt-2">Create your first deck to start studying.</p>
            </div>
          )}
        </div>
      </main>

      {/* Modern Floating Navigation */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
         <nav className="bg-card/90 backdrop-blur-xl border border-white/20 shadow-xl rounded-full px-6 py-3 flex items-center gap-8">
           <Link href="/" className="flex flex-col items-center gap-1 text-primary">
             <BookOpen size={22} className="stroke-[2.5]" />
             <span className="text-[9px] font-bold uppercase tracking-wider">Learn</span>
           </Link>
           <button className="flex flex-col items-center gap-1 text-muted hover:text-foreground transition-colors" onClick={() => alert("Voice Rooms coming soon. (Simplifying architecture)")}>
             <Mic size={22} className="stroke-[2]" />
             <span className="text-[9px] font-bold uppercase tracking-wider">Rooms</span>
           </button>
           <Link href="/profile" className="flex flex-col items-center gap-1 text-muted hover:text-foreground transition-colors">
             <User size={22} className="stroke-[2]" />
             <span className="text-[9px] font-bold uppercase tracking-wider">Profile</span>
           </Link>
         </nav>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showNewDeckModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-sm bg-card rounded-[2.5rem] p-8 shadow-2xl border border-white/10">
              <h2 className="text-xl font-bold mb-6 text-foreground">New Deck</h2>
              <div className="space-y-4 mb-8">
                <input 
                  value={newDeck.name}
                  onChange={e => setNewDeck({...newDeck, name: e.target.value})}
                  placeholder="Deck Name (e.g. Neuroscience)"
                  className="w-full bg-secondary rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-transparent focus:border-primary/30"
                />
                <textarea 
                  value={newDeck.description}
                  onChange={e => setNewDeck({...newDeck, description: e.target.value})}
                  placeholder="What is this deck about?"
                  className="w-full bg-secondary rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/50 transition-all min-h-[100px] resize-none border border-transparent focus:border-primary/30"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowNewDeckModal(false)} className="flex-1 py-4 text-sm font-bold text-muted hover:text-foreground rounded-2xl transition-colors">Cancel</button>
                <button onClick={handleCreateDeck} disabled={!newDeck.name} className="flex-1 py-4 text-sm font-bold bg-foreground text-background rounded-2xl shadow-lg disabled:opacity-50">Create</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
