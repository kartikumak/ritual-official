'use client';

import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Star, Plus, Settings as SettingsIcon, LayoutGrid, LogOut, Download, Upload, Trash2, AlertCircle, TrendingUp, ShoppingBag, User, ChevronRight, Search, Zap } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn, getInitials } from "@/src/lib/utils";
import { useAuth } from "@/src/context/AuthContext";
import { getSupabase } from "@/src/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

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
        
        // Group by day for the last 7 days
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return { day: d.toLocaleDateString('en-US', { weekday: 'short' }), count: 0, fullDate: d.toISOString().split('T')[0] };
        });

        logs.forEach(log => {
          const date = log.reviewed_at.split('T')[0];
          const entry = last7Days.find(d => d.fullDate === date);
          if (entry) entry.count++;
        });

        setChartData(last7Days);
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
    <div className="space-y-8 pb-20">
      {/* Decorative Background Blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px] animate-blob" />
        <div className="absolute bottom-[20%] left-[-5%] w-[30%] h-[30%] bg-secondary/10 rounded-full blur-[80px] animate-blob" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[30%] left-[40%] w-[20%] h-[20%] bg-accent/5 rounded-full blur-[60px] animate-blob" style={{ animationDelay: '4s' }} />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between mt-4">
        <div>
          <h1 className="text-3xl font-serif font-black tracking-tight text-foreground">Hi {profile?.name || "Explorer"}</h1>
          <p className="text-sm font-semibold text-muted-foreground mt-1 opacity-70">Focusing on your knowledge anchors today.</p>
        </div>
        <Link href="/profile">
          <div className="w-14 h-14 rounded-3xl bg-white shadow-neumorphic border border-white/60 flex items-center justify-center group overflow-hidden active:scale-95 transition-all">
            {profile?.avatar_url ? (
               <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
               <span className="text-primary font-black text-xl group-hover:scale-110 transition-transform">{getInitials(profile?.name || user?.email || "?")}</span>
            )}
          </div>
        </Link>
      </header>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-6">
        <div className="p-6 rounded-[2.5rem] bg-white border border-white/60 shadow-neumorphic group hover:shadow-glow transition-all">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Star size={20} className="text-primary" />
          </div>
          <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">Total Recalls</p>
          <p className="text-4xl font-serif font-black text-foreground mt-1">{stats.total}</p>
        </div>
        <div className="p-6 rounded-[2.5rem] bg-white border border-white/60 shadow-neumorphic group hover:shadow-glow transition-all">
          <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
            <TrendingUp size={20} className="text-accent" />
          </div>
          <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">Weekly Pulse</p>
          <p className="text-4xl font-serif font-black text-foreground mt-1">{stats.weekly}</p>
        </div>
      </div>

      {/* Neural Graph (Progress Visualization) */}
      <div className="p-8 rounded-[3rem] bg-white border border-white/60 shadow-neumorphic relative overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-lg font-serif font-black">Neural Map</h3>
            <p className="text-xs font-bold text-muted-foreground opacity-60">Review activity over the last 7 days</p>
          </div>
          <div className="px-4 py-2 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-tighter">
            +5% Growth
          </div>
        </div>
        
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} 
                dy={10}
              />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '1.5rem', 
                  border: 'none', 
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  fontSize: '12px',
                  fontWeight: 'bold'
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

      {/* Marketplace Entry Card */}
      <Link href="/marketplace">
        <div className="p-6 rounded-[2.5rem] bg-gradient-to-br from-primary via-primary-foreground to-secondary text-white shadow-xl group overflow-hidden relative active:scale-[0.98] transition-all">
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute -right-6 -bottom-6 w-40 h-40 bg-white/20 rounded-full blur-3xl animate-blob" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-lg flex items-center justify-center text-primary rotate-3 group-hover:rotate-0 transition-transform">
                <ShoppingBag size={28} />
              </div>
              <div>
                <h3 className="text-xl font-serif font-black leading-none mb-1">Rituals Marketplace</h3>
                <p className="text-xs font-bold text-white/80">Explore public decks from the community</p>
              </div>
            </div>
            <ChevronRight size={24} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </Link>

      {/* Collections Section */}
      <section>
        <div className="flex items-center justify-between mb-6 px-1">
          <h2 className="text-xl font-serif font-black tracking-tight">Active Collections</h2>
          <button 
            onClick={() => setShowNewDeckModal(true)}
            className="w-10 h-10 rounded-full bg-white shadow-neumorphic flex items-center justify-center text-primary hover:scale-110 active:scale-95 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {decks.map((deck, i) => (
            <motion.div 
              key={deck.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-[3rem] bg-white border border-white/60 shadow-neumorphic group relative overflow-hidden transition-all hover:-translate-y-1"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-serif font-black text-foreground group-hover:text-primary transition-colors line-clamp-1">{deck.name}</h3>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-60">
                    {deck.anchorCount} Anchors Defined
                  </p>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => fetchData()} className="p-2 rounded-xl text-muted-foreground hover:bg-muted/10">
                      <SettingsIcon size={16} />
                   </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="w-8 h-8 rounded-full border-2 border-white bg-primary/20 flex items-center justify-center text-[10px] font-black text-primary">
                      {j === 3 ? '+' : ''}
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Link href={`/study/${deck.id}`} className="flex-1">
                    <button className="w-full h-12 rounded-full bg-foreground text-white text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 hover:bg-primary transition-all flex items-center justify-center gap-2 group-hover:shadow-glow">
                      <Zap size={14} fill="currentColor" />
                      RECALL
                    </button>
                  </Link>
                  <button 
                    onClick={async () => {
                      const { error } = await supabase.from('decks').update({ is_public: !deck.is_public }).eq('id', deck.id);
                      if (!error) fetchData();
                    }}
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-all bg-white shadow-neumorphic border border-white/60 active:scale-95",
                      deck.is_public ? "text-primary border-primary/20 bg-primary/5" : "text-muted-foreground/30"
                    )}
                    title={deck.is_public ? "Published to Marketplace" : "Draft (Private)"}
                  >
                    <ShoppingBag size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );

  const renderCreateAnchor = () => (
    <div className="space-y-8 pb-32">
      <header>
        <h1 className="text-3xl font-serif font-black tracking-tight text-foreground">Anchor Deep</h1>
        <p className="text-sm font-semibold text-muted-foreground mt-1 opacity-70">Initialize new neural pathways via deep-context anchors.</p>
      </header>

      <div className="p-8 rounded-[3rem] bg-white border border-white/60 shadow-neumorphic space-y-8">
        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 mb-3 ml-2 block">Knowledge Base</label>
          <select 
            value={selectedDeckId}
            onChange={(e) => setSelectedDeckId(e.target.value)}
            className="w-full h-16 bg-white shadow-neumorphic-inset rounded-[1.5rem] px-6 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none appearance-none"
          >
            <option value="" disabled>Select a collection...</option>
            {decks.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 mb-3 ml-2 block">Core Concept</label>
            <input 
              value={newAnchor.word}
              onChange={(e) => setNewAnchor({...newAnchor, word: e.target.value})}
              className="w-full h-16 bg-white shadow-neumorphic-inset rounded-[1.5rem] px-6 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none placeholder:text-muted-foreground/30" 
              placeholder="e.g. Hebbian Learning"
            />
          </div>
          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 mb-3 ml-2 block">Subtle Hint</label>
            <input 
              value={newAnchor.hint}
              onChange={(e) => setNewAnchor({...newAnchor, hint: e.target.value})}
              className="w-full h-16 bg-white shadow-neumorphic-inset rounded-[1.5rem] px-6 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none placeholder:text-muted-foreground/30" 
              placeholder="Cells that fire together..."
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 mb-3 ml-2 block">Neural Keywords (Semantic validation)</label>
          <input 
            value={newAnchor.keywords}
            onChange={(e) => setNewAnchor({...newAnchor, keywords: e.target.value})}
            className="w-full h-16 bg-white shadow-neumorphic-inset rounded-[1.5rem] px-6 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none placeholder:text-muted-foreground/30" 
            placeholder="synapse, neurons, connection, reinforcing"
          />
        </div>

        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 mb-3 ml-2 block">Deep Reference (The ground truth)</label>
          <textarea 
            value={newAnchor.reference_answer}
            onChange={(e) => setNewAnchor({...newAnchor, reference_answer: e.target.value})}
            className="w-full h-40 bg-white shadow-neumorphic-inset rounded-[2rem] p-8 text-sm font-semibold focus:ring-4 focus:ring-primary/10 outline-none resize-none leading-relaxed placeholder:text-muted-foreground/30" 
            placeholder="Explain the concept in exhaustive detail. The AI will use this to evaluate your future recall attempts."
          />
        </div>

        <button 
          onClick={handleCreateAnchor}
          disabled={!selectedDeckId || !newAnchor.word}
          className="w-full h-16 bg-primary text-white font-black rounded-[2rem] shadow-glow active:scale-95 transition-all text-sm uppercase tracking-widest disabled:opacity-50"
        >
          Initialize Anchor
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 pt-10 min-h-screen relative">
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
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-2xl shadow-neumorphic border border-white/60 p-2 rounded-full flex items-center gap-1 z-50">
        {[
          { id: 'decks', icon: LayoutGrid, label: 'Rituals' },
          { id: 'create', icon: Plus, label: 'Anchor' },
          { id: 'marketplace', icon: ShoppingBag, label: 'Store', href: '/marketplace' },
          { id: 'profile', icon: User, label: 'Profile', href: '/profile' },
        ].map((item) => (
          item.href ? (
            <Link key={item.id} href={item.href}>
              <button className="flex items-center gap-3 px-6 py-3 rounded-full text-[11px] font-black uppercase text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all">
                <item.icon size={20} />
                <span className="hidden md:inline line-clamp-1">{item.label}</span>
              </button>
            </Link>
          ) : (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-full text-[11px] font-black uppercase transition-all",
                activeTab === item.id ? "bg-primary text-white shadow-lg shadow-primary/30" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              )}
            >
              <item.icon size={20} />
              <span className="hidden md:inline line-clamp-1">{item.label}</span>
            </button>
          )
        ))}
      </nav>

      {/* Modal: New Deck */}
      {showNewDeckModal && (
        <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-md flex items-center justify-center p-6">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-neumorphic border border-white/60 relative overflow-hidden">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-serif font-black tracking-tight">New Ritual</h2>
              <button onClick={() => setShowNewDeckModal(false)} className="w-10 h-10 rounded-full bg-muted/20 flex items-center justify-center font-bold">✕</button>
            </div>
            <div className="space-y-8 mb-10">
              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 mb-3 ml-2 block">Title</label>
                <input 
                  value={newDeck.name}
                  onChange={(e) => setNewDeck({...newDeck, name: e.target.value})}
                  className="w-full h-16 bg-white shadow-neumorphic-inset rounded-[1.5rem] px-6 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none" 
                  placeholder="e.g. Quantum Physics" 
                />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 mb-3 ml-2 block">Objective</label>
                <textarea 
                  value={newDeck.description}
                  onChange={(e) => setNewDeck({...newDeck, description: e.target.value})}
                  className="w-full h-32 bg-white shadow-neumorphic-inset rounded-[1.5rem] p-6 text-sm font-semibold focus:ring-4 focus:ring-primary/10 outline-none resize-none leading-relaxed" 
                  placeholder="Define the scope of this domain..." 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 mb-3 ml-2 block">Category</label>
                  <select 
                    value={(newDeck as any).category || 'General'}
                    onChange={(e) => setNewDeck({...newDeck, category: e.target.value} as any)}
                    className="w-full h-14 bg-white shadow-neumorphic-inset rounded-2xl px-5 text-sm font-bold outline-none appearance-none"
                  >
                    {["General", "Science", "Languages", "Medical", "Tech", "Arts", "Business"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 mb-3 ml-2 block">Status</label>
                  <button 
                    onClick={() => setNewDeck({...newDeck, is_public: !(newDeck as any).is_public} as any)}
                    className={cn(
                      "w-full h-14 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all border border-white/60",
                      (newDeck as any).is_public ? "bg-accent/10 text-accent shadow-neumorphic-inset" : "bg-white shadow-neumorphic text-muted-foreground"
                    )}
                  >
                    {(newDeck as any).is_public ? "Public" : "Private"}
                  </button>
                </div>
              </div>
            </div>
            <button 
              onClick={handleCreateDeck}
              disabled={!newDeck.name}
              className="w-full h-16 bg-primary text-white font-black rounded-[2rem] shadow-glow active:scale-95 transition-all text-sm uppercase tracking-widest"
            >
              Initialize Domain
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
