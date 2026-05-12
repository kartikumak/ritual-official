'use client';

import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Star, Plus, Settings as SettingsIcon, LayoutGrid, LogOut, Download, Upload, Trash2, AlertCircle, TrendingUp, ShoppingBag, User, ChevronRight, Search, Zap } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn, getInitials } from "@/src/lib/utils";
import { useAuth } from "@/src/context/AuthContext";
import { getSupabase } from "@/src/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell } from 'recharts';

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
  
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartRange, setChartRange] = useState<"Week" | "Month">("Week");

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
  }, [user, chartRange]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    setDbError(null);
    try {
      // 1. Profile
      let { data: profileData, error: pErr } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      
      if (pErr && pErr.code === 'PGRST116') {
        const { data: newProfile, error: createErr } = await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Explorer'
        }).select().single();
        if (!createErr) profileData = newProfile;
      }

      if (profileData) {
        setProfile(profileData);
      }

      // 2. Decks
      const { data: decksData, error: dErr } = await supabase
        .from('decks')
        .select('*, anchors(id)')
        .eq('user_id', user.id);
      
      if (!dErr) {
        setDecks(decksData?.map(d => ({ ...d, anchorCount: d.anchors?.length || 0 })) || []);
      }

      // 3. Stats & Chart Data
      const { data: logs, error: logsErr } = await supabase
        .from('review_logs')
        .select('reviewed_at')
        .eq('user_id', user.id)
        .order('reviewed_at', { ascending: true });

      if (!logsErr && logs) {
        setStats({ total: logs.length, weekly: logs.filter(l => new Date(l.reviewed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length });
        
        const daysToFetch = chartRange === "Week" ? 7 : 30;
        const historyData = Array.from({ length: daysToFetch }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (daysToFetch - 1 - i));
          return { 
            day: chartRange === "Week" ? d.toLocaleDateString('en-US', { weekday: 'short' }) : d.getDate(), 
            count: 0, 
            fullDate: d.toISOString().split('T')[0] 
          };
        });

        logs.forEach(log => {
          const date = log.reviewed_at.split('T')[0];
          const entry = historyData.find(d => d.fullDate === date);
          if (entry) entry.count++;
        });

        setChartData(historyData);
      }

    } catch (err: any) {
      console.error(err);
      setDbError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeck = async () => {
    if (!newDeck.name || !user) return;
    const { error } = await supabase.from('decks').insert({
      user_id: user.id,
      name: newDeck.name,
      description: newDeck.description,
      category: (newDeck as any).category || 'General',
      is_public: (newDeck as any).is_public || false
    });
    if (!error) {
      setShowNewDeckModal(false);
      setNewDeck({ name: '', description: '' });
      fetchData();
    }
  };

  const handleCreateAnchor = async () => {
    if (!selectedDeckId || !newAnchor.word || !newAnchor.keywords || !newAnchor.reference_answer) {
      alert("Please fill in all required fields.");
      return;
    }

    const { error } = await supabase.from('anchors').insert({
      deck_id: selectedDeckId,
      word: newAnchor.word,
      hint: newAnchor.hint,
      level: newAnchor.level,
      keywords: newAnchor.keywords.split(',').map(k => k.trim()),
      reference_answer: newAnchor.reference_answer
    });

    if (!error) {
      setActiveTab('decks');
      setNewAnchor({ word: '', hint: '', level: 'basic', keywords: '', reference_answer: '' });
      fetchData();
    }
  };

  if (authLoading || (user && loading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin shadow-glow" />
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="space-y-8 pb-24">
      {/* Decorative Background Blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] animate-blob" />
        <div className="absolute bottom-[10%] left-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '3s' }} />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between mt-6">
        <div>
          <h1 className="text-4xl font-serif font-black tracking-tighter text-foreground">Hi {profile?.name || "Explorer"}</h1>
          <p className="text-sm font-bold text-muted-foreground mt-1 tracking-tight opacity-50">Mastering your neural anchors today.</p>
        </div>
        <Link href="/profile">
          <div className="w-16 h-16 rounded-[2.2rem] bg-card shadow-neumorphic border border-white/5 flex items-center justify-center group overflow-hidden active:scale-95 transition-all p-1">
            {profile?.avatar_url ? (
               <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-[1.8rem]" />
            ) : (
               <div className="w-full h-full bg-primary/10 rounded-[1.8rem] flex items-center justify-center">
                  <span className="text-primary font-black text-xl group-hover:scale-110 transition-transform">{getInitials(profile?.name || user?.email || "?")}</span>
               </div>
            )}
          </div>
        </Link>
      </header>

      {/* Quick Trends Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="w-12 h-12 rounded-[1.5rem] bg-primary/20 flex items-center justify-center mb-5 shadow-lg shadow-primary/10">
            <Star size={22} className="text-primary" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Recalls</p>
          <p className="text-4xl md:text-5xl font-serif font-black text-foreground mt-2">{stats.total}</p>
        </div>
        <div className="stat-card sm:col-span-1 lg:col-span-2">
          <div className="w-12 h-12 rounded-[1.5rem] bg-accent/20 flex items-center justify-center mb-5 shadow-lg shadow-accent/10">
            <TrendingUp size={22} className="text-accent" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Weekly Synchronizations</p>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-4xl md:text-5xl font-serif font-black text-foreground">{stats.weekly}</p>
                <p className="text-sm font-bold text-muted-foreground/40 italic">/ {profile?.weekly_goal || 140}</p>
              </div>
            </div>
            <div className="flex-1 max-w-xs w-full bg-white/5 h-2 rounded-full overflow-hidden shadow-inner mb-2">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (stats.weekly / (profile?.weekly_goal || 140)) * 100)}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-accent shadow-glow"
              />
            </div>
          </div>
        </div>
        <div className="stat-card hidden lg:flex flex-col justify-center text-center p-8">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2">Neural Tier</p>
           <p className="text-3xl font-serif font-black">{Math.floor(stats.total / 50) + 1}</p>
           <p className="text-[9px] font-black uppercase text-muted-foreground/30 mt-1">Cognitive Architect</p>
        </div>
      </div>

      {/* Progress Chart Section */}
      <div className="p-8 rounded-[3.5rem] bg-card border border-white/5 shadow-neumorphic relative overflow-hidden">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h3 className="text-2xl font-serif font-black tracking-tight">Neural Map</h3>
            <p className="text-[10px] font-black tracking-[0.2em] uppercase text-muted-foreground/30">Your cognitive growth velocity</p>
          </div>
          <div className="bg-white/5 p-1.5 rounded-[1.2rem] flex gap-1 border border-white/5 shadow-inner">
             <button 
              onClick={() => setChartRange("Week")}
              className={cn(
                "px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] transition-all",
                chartRange === "Week" ? "bg-primary text-white shadow-glow" : "text-muted-foreground hover:bg-white/5"
              )}
             >
               Week
             </button>
             <button 
              onClick={() => setChartRange("Month")}
              className={cn(
                "px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] transition-all",
                chartRange === "Month" ? "bg-primary text-white shadow-glow" : "text-muted-foreground hover:bg-white/5"
              )}
             >
               Month
             </button>
          </div>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 9, fontWeight: 900, fill: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }} 
                dy={20}
              />
              <Tooltip 
                cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                contentStyle={{ 
                  borderRadius: '1.5rem', 
                  border: '1px solid rgba(255,255,255,0.05)', 
                  background: '#151921',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
                  fontSize: '10px',
                  fontWeight: '900',
                  color: '#fff',
                  padding: '12px 16px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#8B5CF6" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorCount)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Browse Marketplace Banner */}
      <Link href="/marketplace">
        <div className="p-8 rounded-[3.5rem] bg-gradient-to-br from-primary via-[#9333EA] to-[#DB2777] text-white shadow-glow group overflow-hidden relative active:scale-[0.98] transition-all">
          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-blob" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-[1.8rem] bg-white/20 backdrop-blur-md shadow-xl flex items-center justify-center rotate-6 group-hover:rotate-0 transition-transform">
                <ShoppingBag size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-serif font-black leading-tight">Explore Store</h3>
                <p className="text-sm font-bold text-white/70">Bridge shared knowledge ritual</p>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-2 transition-transform">
              <ChevronRight size={28} />
            </div>
          </div>
        </div>
      </Link>

      {/* Active Rituals Rows */}
      <section>
        <div className="flex items-center justify-between mb-8 px-2">
          <h2 className="text-2xl font-serif font-black tracking-tight underline decoration-primary/30 decoration-4 underline-offset-8">Neural Domains</h2>
          <button 
            onClick={() => setShowNewDeckModal(true)}
            className="w-12 h-12 rounded-2xl bg-card shadow-neumorphic flex items-center justify-center text-primary group hover:scale-110 active:scale-90 transition-all border border-white/5"
          >
            <Plus size={24} className="group-hover:rotate-90 transition-transform duration-500" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {decks.map((deck, i) => (
            <motion.div 
              key={deck.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-3 rounded-[2.5rem] bg-card border border-white/5 shadow-neumorphic group relative overflow-hidden transition-all hover:bg-card/80"
            >
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-[2rem] bg-primary/10 flex flex-col items-center justify-center overflow-hidden shrink-0">
                   <p className="text-2xl font-black text-primary">{deck.anchorCount}</p>
                   <p className="text-[9px] font-black uppercase text-primary/50 tracking-tighter">Nodes</p>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-serif font-black text-foreground group-hover:text-primary transition-colors truncate">{deck.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="px-3 py-1 rounded-full bg-foreground/5 text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                       <LayoutGrid size={10} />
                       {deck.category || 'General'}
                    </span>
                    {deck.is_public && (
                      <span className="px-3 py-1 rounded-full bg-accent/10 text-[9px] font-black uppercase tracking-widest text-accent">Published</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pr-4">
                  <Link href={`/study/${deck.id}`}>
                    <button className="w-14 h-14 rounded-2xl bg-foreground text-white shadow-lg active:scale-90 hover:bg-primary transition-all flex items-center justify-center group-hover:shadow-glow">
                      <Zap size={20} fill="currentColor" />
                    </button>
                  </Link>
                   <button 
                    onClick={async () => {
                      const { error } = await supabase.from('decks').update({ is_public: !deck.is_public }).eq('id', deck.id);
                      if (!error) fetchData();
                    }}
                    className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center transition-all bg-foreground/5 active:scale-90",
                      deck.is_public ? "text-primary bg-primary/5" : "text-muted-foreground/20"
                    )}
                   >
                     <ShoppingBag size={20} />
                   </button>
                </div>
              </div>
            </motion.div>
          ))}

          {decks.length === 0 && (
            <div className="p-16 text-center rounded-[3.5rem] bg-card border-2 border-dashed border-white/5 opacity-50">
               <p className="text-xl font-serif font-black text-muted-foreground">Domain Void</p>
               <p className="text-sm font-bold text-muted-foreground/60 mt-1">Initialize your first neural collection.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );

  const renderCreateAnchor = () => (
    <div className="space-y-10 pb-32">
      <header className="space-y-2">
        <h1 className="text-4xl font-serif font-black tracking-tight text-foreground leading-none">Anchor Deep</h1>
        <p className="text-[10px] font-black tracking-[0.2em] uppercase text-muted-foreground/30">Initialize new neural pathways via deep-context anchors.</p>
      </header>

      <div className="p-12 rounded-[4rem] bg-card border border-white/5 shadow-neumorphic space-y-12 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors" />
        
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/20 ml-2 block italic">Neural Knowledge Base</label>
          <div className="relative group">
            <select 
              value={selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value)}
              className="w-full h-20 bg-white/5 shadow-neumorphic-inset rounded-[2.5rem] px-8 text-lg font-bold focus:ring-8 focus:ring-primary/5 outline-none appearance-none border border-transparent focus:border-primary/20 transition-all text-foreground"
            >
              <option value="" disabled className="bg-background">Select a ritual domain...</option>
              {decks.map(d => (
                <option key={d.id} value={d.id} className="bg-background">{d.name}</option>
              ))}
            </select>
            <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/30">
              <ChevronRight size={20} className="rotate-90" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/20 ml-2 block italic">Core Conceptual Key</label>
            <input 
              value={newAnchor.word}
              onChange={(e) => setNewAnchor({...newAnchor, word: e.target.value})}
              className="w-full h-20 bg-white/5 shadow-neumorphic-inset rounded-[2.5rem] px-8 text-xl font-black focus:ring-8 focus:ring-primary/5 outline-none border border-transparent focus:border-primary/20 transition-all text-white placeholder:text-muted-foreground/10" 
              placeholder="e.g. Hebbian Learning"
            />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/20 ml-2 block italic">Subtle Retrieval Hint</label>
            <input 
              value={newAnchor.hint}
              onChange={(e) => setNewAnchor({...newAnchor, hint: e.target.value})}
              className="w-full h-20 bg-white/5 shadow-neumorphic-inset rounded-[2.5rem] px-8 text-sm font-bold focus:ring-8 focus:ring-primary/5 outline-none border border-transparent focus:border-primary/20 transition-all text-white placeholder:text-muted-foreground/10" 
              placeholder="Cells that fire together..."
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/20 ml-2 block italic">Semantic Validation Strings (Keywords)</label>
          <input 
            value={newAnchor.keywords}
            onChange={(e) => setNewAnchor({...newAnchor, keywords: e.target.value})}
            className="w-full h-20 bg-white/5 shadow-neumorphic-inset rounded-[2.5rem] px-8 text-sm font-bold focus:ring-8 focus:ring-primary/5 outline-none border border-transparent focus:border-primary/20 transition-all text-white placeholder:text-muted-foreground/10" 
            placeholder="synapse, neurons, connection, reinforcing..."
          />
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/20 ml-2 block italic">Canonical Manifestation (Ground Truth)</label>
          <textarea 
            value={newAnchor.reference_answer}
            onChange={(e) => setNewAnchor({...newAnchor, reference_answer: e.target.value})}
            className="w-full h-48 bg-white/5 shadow-neumorphic-inset rounded-[3rem] p-10 text-lg font-bold focus:ring-8 focus:ring-primary/5 outline-none resize-none leading-relaxed border border-transparent focus:border-primary/20 transition-all text-white placeholder:text-muted-foreground/10" 
            placeholder="Articulate the concept in exhaustive detail. The Architect AI will use this to verify your future neural synchronizations."
          />
        </div>

        <button 
          onClick={handleCreateAnchor}
          disabled={!selectedDeckId || !newAnchor.word}
          className="w-full h-24 bg-primary text-white font-black rounded-[3rem] shadow-glow active:scale-95 transition-all text-sm uppercase tracking-[0.3em] disabled:opacity-20 group"
        >
          <div className="flex items-center justify-center gap-4">
            <Zap size={24} fill="currentColor" className="group-hover:scale-125 transition-transform" />
            Initialize Anchor
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-10 min-h-screen relative">
      <AnimatePresence mode="wait">
        {activeTab === 'decks' && (
          <motion.div key="dashboard" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            {renderDashboard()}
          </motion.div>
        )}
        {activeTab === 'create' && (
          <motion.div key="create" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            {renderCreateAnchor()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Rail */}
      <nav className="fixed bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 bg-card/60 backdrop-blur-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] border border-white/5 p-1.5 sm:p-2 rounded-[2rem] sm:rounded-[2.5rem] flex items-center gap-1 sm:gap-2 z-50 ring-1 ring-white/10 active:scale-95 transition-all">
        {[
          { id: 'decks', icon: LayoutGrid, label: 'Rituals' },
          { id: 'create', icon: Plus, label: 'Anchor' },
          { id: 'marketplace', icon: ShoppingBag, label: 'Store', href: '/marketplace' },
          { id: 'profile', icon: User, label: 'Profile', href: '/profile' },
        ].map((item) => (
          item.href ? (
            <Link key={item.id} href={item.href} className="group">
              <button className="flex items-center gap-2 sm:gap-3 px-5 sm:px-8 py-3 sm:py-4 rounded-[1.5rem] sm:rounded-[1.8rem] text-[9px] sm:text-[10px] font-black uppercase text-muted-foreground hover:text-primary hover:bg-white/5 transition-all tracking-[0.1em] sm:tracking-[0.2em]">
                <item.icon size={20} className="sm:w-[22px] sm:h-[22px] group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline line-clamp-1">{item.label}</span>
              </button>
            </Link>
          ) : (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center gap-2 sm:gap-3 px-5 sm:px-8 py-3 sm:py-4 rounded-[1.5rem] sm:rounded-[1.8rem] text-[9px] sm:text-[10px] font-black uppercase transition-all tracking-[0.1em] sm:tracking-[0.2em] relative group",
                activeTab === item.id ? "bg-primary text-white shadow-glow" : "text-muted-foreground hover:text-primary hover:bg-white/5"
              )}
            >
              <item.icon size={20} className={cn("sm:w-[22px] sm:h-[22px] transition-transform group-hover:scale-110", activeTab === item.id && "scale-110")} />
              <span className="hidden sm:inline line-clamp-1">{item.label}</span>
              {activeTab === item.id && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-white rounded-full blur-[2px]" />
              )}
            </button>
          )
        ))}
      </nav>

      {/* Modal: New Deck */}
      {showNewDeckModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xl flex items-center justify-center p-8">
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="w-full max-w-lg bg-card rounded-[4rem] p-12 shadow-neumorphic border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
            
            <div className="flex justify-between items-center mb-12 relative z-10">
              <div className="space-y-1">
                <h2 className="text-4xl font-serif font-black tracking-tight leading-none">New Ritual</h2>
                <p className="text-[10px] font-black tracking-[0.2em] uppercase text-muted-foreground/30">Define a new neural collection</p>
              </div>
              <button 
                onClick={() => setShowNewDeckModal(false)} 
                className="w-12 h-12 rounded-[1.2rem] bg-white/5 flex items-center justify-center font-bold text-muted-foreground hover:text-rose-500 transition-colors border border-white/5"
              >
                ✕
              </button>
            </div>

            <div className="space-y-10 mb-12 relative z-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/20 ml-2 block italic">Conceptual Title</label>
                <input 
                  value={newDeck.name}
                  onChange={(e) => setNewDeck({...newDeck, name: e.target.value})}
                  className="w-full h-20 bg-white/5 shadow-neumorphic-inset rounded-[1.8rem] px-8 text-lg font-bold focus:ring-8 focus:ring-primary/5 outline-none border border-transparent focus:border-primary/20 transition-all text-white placeholder:text-muted-foreground/20" 
                  placeholder="e.g. Cognitive Psychology" 
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/20 ml-2 block italic">Ritual Objective</label>
                <textarea 
                  value={newDeck.description}
                  onChange={(e) => setNewDeck({...newDeck, description: e.target.value})}
                  className="w-full h-40 bg-white/5 shadow-neumorphic-inset rounded-[2rem] p-8 text-sm font-semibold focus:ring-8 focus:ring-primary/5 outline-none resize-none leading-relaxed border border-transparent focus:border-primary/20 transition-all text-white placeholder:text-muted-foreground/20" 
                  placeholder="Define the scope and deep context of this domain to guide neural associations..." 
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/20 ml-2 block italic">Domain</label>
                  <div className="relative group">
                    <select 
                      value={(newDeck as any).category || 'General'}
                      onChange={(e) => setNewDeck({...newDeck, category: e.target.value} as any)}
                      className="w-full h-16 bg-white/5 shadow-neumorphic-inset rounded-[1.5rem] px-6 text-xs font-black uppercase tracking-widest outline-none appearance-none border border-transparent focus:border-primary/20 transition-all text-white"
                    >
                      {["General", "Science", "Languages", "Medical", "Tech", "Arts", "Business"].map(c => (
                        <option key={c} value={c} className="bg-background text-foreground">{c.toUpperCase()}</option>
                      ))}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/40">
                      <ChevronRight size={14} className="rotate-90" />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/20 ml-2 block italic">Visibility</label>
                  <button 
                    onClick={() => setNewDeck({...newDeck, is_public: !(newDeck as any).is_public} as any)}
                    className={cn(
                      "w-full h-16 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all border shadow-neumorphic active:scale-95",
                      (newDeck as any).is_public ? "bg-accent/10 text-accent border-accent/20 shadow-glow" : "bg-white/5 text-muted-foreground border-white/5"
                    )}
                  >
                    {(newDeck as any).is_public ? "Universal" : "Personal"}
                  </button>
                </div>
              </div>
            </div>
            <button 
              onClick={handleCreateDeck}
              disabled={!newDeck.name}
              className="w-full h-20 bg-primary text-white font-black rounded-[2.5rem] shadow-glow active:scale-95 transition-all text-sm uppercase tracking-[0.3em] disabled:opacity-20"
            >
              Synchronize Domain
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
