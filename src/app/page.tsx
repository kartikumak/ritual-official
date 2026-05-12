'use client';

import { motion } from "framer-motion";
import { BookOpen, Star, Plus, Settings as SettingsIcon, LayoutGrid, LogOut, Download, Upload, Trash2, AlertCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn, getInitials } from "@/src/lib/utils";
import { useAuth } from "@/src/context/AuthContext";
import { getSupabase } from "@/src/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const { user, signOut, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("decks");
  const [profile, setProfile] = useState<any>(null);
  const [decks, setDecks] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, weekly: 0 });
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [showNewDeckModal, setShowNewDeckModal] = useState(false);
  const [newDeck, setNewDeck] = useState({ name: '', description: '' });
  const [newAnchor, setNewAnchor] = useState({ word: '', hint: '', level: 'basic', keywords: '', reference_answer: '' });
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [editProfileMode, setEditProfileMode] = useState(false);
  const [editedName, setEditedName] = useState('');

  const supabase = getSupabase();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    setDbError(null);
    try {
      // 1. Profile
      const { data: profile, error: pErr } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
      if (!pErr) {
        setProfile(profile);
        setEditedName(profile.name || '');
      }

      // 2. Decks with anchor counts
      const { data: decksData, error: dErr } = await supabase
        .from('decks')
        .select('*, anchors(count)')
        .eq('user_id', user?.id);
      
      if (dErr) {
        if (dErr.code === 'PGRST116' || dErr.message.includes('relation "decks" does not exist')) {
          setDbError("Tables not initialized. Please run the SQL schema in your Supabase SQL Editor.");
        } else {
          setDbError(dErr.message);
        }
      }
      setDecks(decksData || []);

      // 3. Stats
      const { count: totalReviews } = await supabase
        .from('review_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      // Simple weekly count
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: weeklyReviews } = await supabase
        .from('review_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .gte('reviewed_at', sevenDaysAgo.toISOString());

      setStats({ 
        total: totalReviews || 0, 
        weekly: weeklyReviews || 0 
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeck = async () => {
    if (!newDeck.name) return;
    const { error } = await supabase.from('decks').insert({
      user_id: user?.id,
      name: newDeck.name,
      description: newDeck.description
    });
    if (!error) {
      setShowNewDeckModal(false);
      setNewDeck({ name: '', description: '' });
      fetchData();
    }
  };

  const handleCreateAnchor = async () => {
    if (!selectedDeckId || !newAnchor.word || !newAnchor.keywords || !newAnchor.reference_answer) {
      alert("Please fill in all required fields and select a deck.");
      return;
    }

    const { error } = await supabase.from('anchors').insert({
      deck_id: selectedDeckId,
      word: newAnchor.word,
      hint: newAnchor.hint,
      level: newAnchor.level,
      keywords: newAnchor.keywords.split(',').map(k => k.trim()).filter(Boolean),
      reference_answer: newAnchor.reference_answer
    });

    if (!error) {
      setActiveTab('decks');
      setNewAnchor({ word: '', hint: '', level: 'basic', keywords: '', reference_answer: '' });
      setSelectedDeckId('');
      fetchData();
      alert("Anchor created successfully!");
    } else {
      alert("Error: " + error.message);
    }
  };

  const handleDeleteDeck = async (id: string) => {
    if (!confirm('Are you sure? This will delete all anchors in this deck.')) return;
    await supabase.from('decks').delete().eq('id', id);
    fetchData();
  };

  const handleExportDeck = async (deck: any) => {
    const { data: anchors } = await supabase.from('anchors').select('*').eq('deck_id', deck.id);
    const exportData = {
      version: '1.0',
      type: 'rituals-deck',
      deck: {
        name: deck.name,
        description: deck.description,
        anchors: anchors?.map(a => ({
          word: a.word,
          hint: a.hint,
          level: a.level,
          keywords: a.keywords,
          reference_answer: a.reference_answer
        }))
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.name.toLowerCase().replace(/\s+/g, '-')}-export.json`;
    a.click();
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.type !== 'rituals-deck') throw new Error('Invalid deck format');

        const { data: deck, error: deckError } = await supabase
          .from('decks')
          .insert({ user_id: user?.id, name: json.deck.name, description: json.deck.description })
          .select()
          .single();

        if (deckError) throw deckError;

        const anchorsToInsert = json.deck.anchors.map((a: any) => ({
          deck_id: deck.id,
          ...a
        }));

        await supabase.from('anchors').insert(anchorsToInsert);
        fetchData();
        alert('Deck imported successfully!');
      } catch (err: any) {
        alert('Import failed: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleUpdateProfile = async () => {
    if (!editedName) return;
    const { error } = await supabase.from('profiles').update({ name: editedName }).eq('id', user?.id as string);
    if (!error) {
      setProfile({ ...profile, name: editedName });
      setEditProfileMode(false);
      alert('Profile updated successfully!');
    } else {
      alert("Error: " + error.message);
    }
  };

  if (authLoading || (user && loading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "decks":
        return (
          <section className="animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-4 mt-2">
              <h2 className="text-sm font-bold">My Collections</h2>
              <div className="flex gap-2">
                <button 
                  onClick={handleImportClick}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/10 px-3 py-1.5 rounded-full hover:bg-muted/20 transition-colors"
                >
                  <Upload size={12} />
                  <span>Import</span>
                </button>
                <button 
                  onClick={() => setShowNewDeckModal(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary/80 bg-primary/5 px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors"
                >
                  <Plus size={14} />
                  <span>New Deck</span>
                </button>
              </div>
            </div>

            <input type="file" ref={fileInputRef} hidden accept=".json" onChange={handleImportFile} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {decks.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-primary/20 rounded-[2.5rem] md:col-span-2 bg-white/50 shadow-neumorphic relative overflow-hidden group">
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="w-16 h-16 bg-white shadow-neumorphic rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                    <BookOpen size={24} className="text-primary/70" />
                  </div>
                  <h3 className="text-lg font-serif font-bold mb-2 relative z-10 text-foreground">Begin your Rituals</h3>
                  <p className="text-sm text-muted-foreground mb-6 font-medium relative z-10">Create your first collection to start anchoring.</p>
                  <button onClick={() => setShowNewDeckModal(true)} className="bg-primary text-white px-8 py-3 rounded-full text-sm font-bold shadow-lg active:scale-95 transition-transform relative z-10">
                    Initialize
                  </button>
                </div>
              ) : (
                decks.map((deck, i) => (
                  <motion.div 
                    key={deck.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-5 rounded-[2rem] border border-white/40 bg-card shadow-neumorphic group relative overflow-hidden transition-all hover:bg-card/90"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 pr-4">
                        <h3 className="text-lg font-serif font-bold text-foreground group-hover:text-primary transition-colors">
                          {deck.name}
                        </h3>
                        <p className="text-xs mt-1.5 text-muted-foreground/80 line-clamp-2 leading-relaxed font-medium">
                          {deck.description || "No specific goal defined. Expand your knowledge structure."}
                        </p>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => handleExportDeck(deck)} className="p-2 rounded-xl bg-white shadow-md text-emerald-600 hover:scale-110 transition-transform" title="Export JSON">
                            <Download size={14} />
                         </button>
                         <button onClick={() => handleDeleteDeck(deck.id)} className="p-2 rounded-xl bg-white shadow-md text-rose-500 hover:scale-110 transition-transform" title="Delete Collection">
                            <Trash2 size={14} />
                         </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="px-3 py-1.5 rounded-full text-[10px] font-bold bg-primary/5 border border-primary/10 text-primary flex items-center gap-1.5 shadow-sm">
                        <LayoutGrid size={10} />
                        {(deck.anchors?.[0]?.count || 0)} anchors
                      </div>
                      {(deck.anchors?.[0]?.count || 0) > 0 ? (
                        <Link href={`/study/${deck.id}`}>
                          <button className="px-6 py-2.5 rounded-full text-xs font-bold bg-primary text-white shadow-lg active:scale-95 hover:bg-primary-light transition-all flex items-center gap-2">
                            Dive In
                          </button>
                        </Link>
                      ) : (
                        <button 
                          onClick={() => {
                            setSelectedDeckId(deck.id);
                            setActiveTab('create');
                          }}
                          className="px-6 py-2.5 rounded-full text-xs font-bold border border-border bg-white text-muted-foreground shadow-sm active:scale-95 hover:text-primary hover:border-primary/30 transition-all"
                        >
                          Add Anchor
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </section>
        );
      case "settings":
        return (
          <div className="space-y-6 pt-2 animate-in slide-in-from-bottom-2 duration-300">
             <div>
                <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3 ml-1">Learning Behavior</h3>
                <div className="space-y-2">
                   <div className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold">Concept Reveal Hints</p>
                        <p className="text-[10px] text-muted-foreground">Show context clues by default</p>
                      </div>
                      <div className="w-10 h-6 bg-primary rounded-full relative"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" /></div>
                   </div>
                </div>
             </div>

             <div>
                <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3 ml-1">Account Controls</h3>
                <div className="space-y-2">
                   <div className="p-5 rounded-2xl bg-card border border-border">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                           {getInitials(profile?.name || user?.email || "?")}
                        </div>
                        <div className="flex-1">
                           {editProfileMode ? (
                             <input 
                               value={editedName} 
                               onChange={e => setEditedName(e.target.value)}
                               className="w-full text-sm font-bold bg-muted/5 border border-border rounded-lg px-2 py-1 focus:border-primary outline-none"
                             />
                           ) : (
                             <p className="text-sm font-bold">{profile?.name || "Member"}</p>
                           )}
                           <p className="text-xs text-muted-foreground">{user?.email}</p>
                        </div>
                        {editProfileMode ? (
                          <button onClick={handleUpdateProfile} className="text-xs font-bold text-primary hover:underline">Save</button>
                        ) : (
                          <button onClick={() => setEditProfileMode(true)} className="text-xs font-bold text-primary hover:underline">Edit</button>
                        )}
                      </div>
                      <button 
                        onClick={signOut}
                        className="w-full h-12 rounded-xl bg-rose-50 text-rose-600 font-bold text-xs flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors"
                      >
                        <LogOut size={14} />
                        Sign Out & Disconnect
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="px-6 pt-12 pb-6 flex items-center justify-between">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold mb-1">
            Welcome back
          </p>
          <h1 className="text-2xl font-serif font-bold text-foreground">
            {profile?.name || "Explorer"}
          </h1>
        </motion.div>
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shadow-inner ring-4 ring-white">
          {profile ? getInitials(profile.name) : "U"}
        </div>
      </header>

      <div className="px-6 flex-1">
        {dbError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold leading-relaxed shadow-sm flex items-start gap-3">
            <AlertCircle className="shrink-0 mt-0.5" size={14} />
            <div>
              <p className="uppercase tracking-wider mb-1">System Error</p>
              <p className="font-medium normal-case opacity-80">{dbError}</p>
            </div>
          </div>
        )}

        {activeTab === "decks" && (
          <div className="space-y-8 mb-8 relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] animate-blob" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-400/10 rounded-full blur-[80px] animate-blob" style={{ animationDelay: '2s' }} />
            
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-[2rem] bg-card border border-white/60 shadow-neumorphic">
                <p className="text-[11px] text-muted-foreground font-bold mb-1 uppercase tracking-widest">Total Recall</p>
                <p className="text-4xl font-serif font-bold text-primary animate-breathe">{stats.total}</p>
                <p className="text-[10px] text-muted-foreground mt-1">successful anchors</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-5 rounded-[2rem] bg-card border border-white/60 shadow-neumorphic">
                <p className="text-[11px] text-muted-foreground font-bold mb-1 uppercase tracking-widest">This Week</p>
                <p className="text-4xl font-serif font-bold animate-breathe">{stats.weekly}</p>
                <p className="text-[10px] text-muted-foreground mt-1">active reviews</p>
              </motion.div>
            </div>

            <section className="relative z-10">
              <div className="p-6 rounded-[2.5rem] bg-primary text-white shadow-lg relative overflow-hidden flex items-center gap-6">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 animate-blob" />
                <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-primary-light/30 rounded-full blur-[30px] translate-y-1/2 animate-blob" style={{ animationDelay: '3s' }} />
                
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/20" />
                    <motion.circle 
                      cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" 
                      strokeDasharray="251.2"
                      initial={{ strokeDashoffset: 251.2 }}
                      animate={{ strokeDashoffset: 251.2 * (1 - Math.min(stats.weekly / (profile?.weekly_goal || 140), 1)) }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="text-white"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold">{Math.round((stats.weekly / (profile?.weekly_goal || 140)) * 100)}%</span>
                  </div>
                </div>
                <div className="relative">
                  <h3 className="text-base font-bold mb-1 tracking-tight">Weekly Target</h3>
                  <p className="text-xs text-white/80 font-medium">{stats.weekly} of {profile?.weekly_goal || 140} anchors anchored</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {renderTabContent()}
      </div>

      {/* Footer Branding */}
      <footer className="px-6 py-12 mb-12 border-t border-border/50 text-center opacity-40 hover:opacity-100 transition-opacity">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">
          Designed for thinkers.
        </p>
        <div className="flex justify-center gap-6 text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-6">
          <Link href="/about" className="hover:text-primary transition-colors">About</Link>
          <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-[1px] bg-muted-foreground/30" />
          <span className="text-[10px] font-medium italic text-muted-foreground">Made by Kartik</span>
          <div className="w-4 h-[1px] bg-muted-foreground/30" />
        </div>
      </footer>

      {/* Modal: New Deck */}
      {showNewDeckModal && (
        <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
          <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md bg-white rounded-[2.5rem] p-8 md:p-10 shadow-neumorphic border border-white/60 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 animate-blob" />
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h2 className="text-2xl font-bold font-serif tracking-tight">New Collection</h2>
              <button onClick={() => setShowNewDeckModal(false)} className="w-10 h-10 rounded-full bg-muted/20 flex items-center justify-center font-bold text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors">✕</button>
            </div>
            <div className="space-y-6 mb-10 relative z-10">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2 mb-2 block">Collection Name</label>
                <input 
                  value={newDeck.name}
                  onChange={(e) => setNewDeck({...newDeck, name: e.target.value})}
                  className="w-full h-14 bg-white border border-white/60 shadow-neumorphic-inset rounded-2xl px-5 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/40" 
                  placeholder="e.g. Cognitive Biases" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2 mb-2 block">Knowledge Domain</label>
                <textarea 
                  value={newDeck.description}
                  onChange={(e) => setNewDeck({...newDeck, description: e.target.value})}
                  className="w-full h-28 bg-white border border-white/60 shadow-neumorphic-inset rounded-2xl p-5 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none resize-none transition-all leading-relaxed placeholder:text-muted-foreground/40" 
                  placeholder="What will you master here?" 
                />
              </div>
            </div>
            <button 
              onClick={handleCreateDeck}
              disabled={!newDeck.name}
              className="w-full h-14 bg-primary text-white font-bold rounded-2xl shadow-lg ring-offset-2 active:scale-95 transition-all disabled:opacity-50 relative z-10 text-sm"
            >
              Initialize Collection
            </button>
          </motion.div>
        </div>
      )}

      {/* Modal: New Anchor */}
      {activeTab === 'create' && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
          <motion.div 
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-md bg-white rounded-[2.5rem] p-8 md:p-10 shadow-neumorphic border border-white/60 relative overflow-hidden overflow-y-auto max-h-[90vh]"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 animate-blob" />
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h2 className="text-2xl font-bold font-serif tracking-tight">Deep Anchor</h2>
              <button 
                onClick={() => setActiveTab('decks')}
                className="w-10 h-10 rounded-full bg-muted/20 flex items-center justify-center font-bold text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 mb-10 relative z-10">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2 mb-2 block">Target Collection</label>
                <select 
                  value={selectedDeckId}
                  onChange={(e) => setSelectedDeckId(e.target.value)}
                  className="w-full h-14 bg-white border border-white/60 shadow-neumorphic-inset rounded-2xl px-5 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                >
                  <option value="" disabled>Select a deck...</option>
                  {decks.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2 mb-2 block">Anchor Concept</label>
                <input 
                  value={newAnchor.word}
                  onChange={(e) => setNewAnchor({...newAnchor, word: e.target.value})}
                  className="w-full h-14 bg-white border border-white/60 shadow-neumorphic-inset rounded-2xl px-5 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted-foreground/40" 
                  placeholder="e.g. Sunk Cost Fallacy" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2 mb-2 block">Level</label>
                    <select 
                      value={newAnchor.level}
                      onChange={(e) => setNewAnchor({...newAnchor, level: e.target.value})}
                      className="w-full h-14 bg-white border border-white/60 shadow-neumorphic-inset rounded-2xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                    >
                      <option value="basic">Basic</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2 mb-2 block">Subtle Hint</label>
                    <input 
                      value={newAnchor.hint}
                      onChange={(e) => setNewAnchor({...newAnchor, hint: e.target.value})}
                      className="w-full h-14 bg-white border border-white/60 shadow-neumorphic-inset rounded-2xl px-4 text-sm italic font-medium focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted-foreground/40" 
                      placeholder="Context..." 
                    />
                 </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2 mb-2 block">Keywords (comma-separated)</label>
                <input 
                  value={newAnchor.keywords}
                  onChange={(e) => setNewAnchor({...newAnchor, keywords: e.target.value})}
                  className="w-full h-14 bg-white border border-white/60 shadow-neumorphic-inset rounded-2xl px-5 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted-foreground/40" 
                  placeholder="investment, bias, loss" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2 mb-2 block">Reference Truth</label>
                <textarea 
                  value={newAnchor.reference_answer}
                  onChange={(e) => setNewAnchor({...newAnchor, reference_answer: e.target.value})}
                  className="w-full h-28 bg-white border border-white/60 shadow-neumorphic-inset rounded-2xl p-5 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none resize-none leading-relaxed placeholder:text-muted-foreground/40" 
                  placeholder="The ground truth explanation for the AI to benchmark your recall against..." 
                />
              </div>
            </div>

            <button 
              onClick={handleCreateAnchor}
              className="w-full h-14 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg ring-offset-2 active:scale-95 transition-all text-sm relative z-10"
            >
              Anchor Concept
            </button>
          </motion.div>
        </div>
      )}

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-4xl mx-auto bg-card/80 backdrop-blur-xl border-t border-border px-6 py-4 flex items-center justify-around z-50 rounded-t-[2.5rem] md:bottom-8 md:left-8 md:right-8 md:w-fit md:mx-auto md:rounded-full md:px-12 md:shadow-lg">
        {[
          { id: 'decks', icon: LayoutGrid, label: 'Collections' },
          { id: 'create', icon: Plus, label: 'Anchor' },
          { id: 'settings', icon: SettingsIcon, label: 'Settings' },
        ].map((item) => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 w-16 transition-all duration-300",
              activeTab === item.id ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
