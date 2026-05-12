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
    <div className="space-y-6 pb-24 max-w-[420px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* App Header */}
      <header className="flex items-center justify-between py-10 px-0">
        <div>
          <p className="text-[10px] font-medium tracking-[0.13em] uppercase text-muted mb-1">Welcome back</p>
          <h1 className="text-[26px] font-serif font-normal text-foreground leading-tight">{profile?.name || "Max"}</h1>
        </div>
        <Link href="/profile" className="w-[42px] h-[42px] rounded-full bg-primary-lighter text-primary font-semibold flex items-center justify-center text-[15px] shrink-0 hover:bg-primary-light transition-colors">
          {getInitials(profile?.name || user?.email || "M")}
        </Link>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-sm animate-in fade-in slide-in-from-bottom-2 duration-500 delay-75">
          <p className="text-[11px] text-muted mb-1 font-medium">Total Reviewed</p>
          <div className="flex items-baseline gap-1">
            <span className="text-[32px] font-semibold text-primary leading-none">{stats.total}</span>
            <span className="text-[11px] text-muted">anchors</span>
          </div>
        </div>
        <div className="card-sm animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
          <p className="text-[11px] text-muted mb-1 font-medium">Active Decks</p>
          <div className="flex items-baseline gap-1">
            <span className="text-[32px] font-semibold text-foreground leading-none">{decks.length}</span>
            <span className="text-[11px] text-muted">collections</span>
          </div>
        </div>
      </div>

      {/* Activity Graph */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[13px] font-bold text-foreground">Activity</span>
            <div className="flex bg-secondary p-1 rounded-full">
               <button 
                onClick={() => setChartRange("Week")}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[11px] font-bold transition-all",
                  chartRange === "Week" ? "bg-primary text-white shadow-md" : "text-muted hover:text-foreground"
                )}
               >
                 Week
               </button>
               <button 
                onClick={() => setChartRange("Month")}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[11px] font-bold transition-all",
                  chartRange === "Month" ? "bg-primary text-white shadow-md" : "text-muted hover:text-foreground"
                )}
               >
                 Month
               </button>
            </div>
          </div>
          <div className="h-[140px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.18}/>
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: 'var(--color-muted)', fontFamily: 'DM Sans' }} 
                  dy={10}
                />
                <Tooltip 
                  cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }}
                  contentStyle={{ 
                    borderRadius: '10px', 
                    border: '1px solid var(--color-border)', 
                    background: '#fff',
                    boxShadow: 'var(--shadow-sm)',
                    fontSize: '11px',
                    fontFamily: 'DM Sans'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="var(--color-primary)" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Weekly Progress */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
        <div className="card">
          <p className="text-[13px] font-bold text-foreground mb-4">Weekly Goal</p>
          <div className="flex items-center gap-5">
            <div className="relative w-16 h-16 shrink-0">
               <svg className="w-full h-full -rotate-90">
                 <circle cx="32" cy="32" r="26" className="fill-none stroke-secondary stroke-[7px]" />
                 <motion.circle 
                  cx="32" cy="32" r="26" 
                  className="fill-none stroke-primary stroke-[7px] stroke-round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: Math.min(1, stats.weekly / (profile?.weekly_goal || 140)) }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                 />
               </svg>
               <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[12px] font-bold text-primary">{Math.round((stats.weekly / (profile?.weekly_goal || 140)) * 100)}%</span>
               </div>
            </div>
            <div>
              <div className="text-[22px] font-bold text-primary leading-none mb-1">{stats.weekly} <span className="text-[13px] text-muted font-medium">/ {profile?.weekly_goal || 140}</span></div>
              <p className="text-[11px] text-muted uppercase tracking-[0.05em]">anchors anchored this week</p>
            </div>
          </div>
        </div>
      </div>

      {/* Decks Section */}
      <section className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-400">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[13px] font-bold text-foreground">My Decks</h2>
          <button 
            onClick={() => setShowNewDeckModal(true)}
            className="btn-primary btn-sm px-4 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5"
          >
            <Plus size={12} />
            New deck
          </button>
        </div>

        <div className="space-y-3">
          {decks.map((deck, i) => (
            <motion.div 
              key={deck.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="bg-card rounded-[--radius] p-4 border border-border border-l-[3px] border-l-primary-light shadow-[--shadow-sm] hover:shadow-[--shadow-md] transition-all group cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[14px] font-semibold text-foreground leading-tight">{deck.name}</h3>
                  <p className="text-[11px] text-muted mt-0.5 line-clamp-1">{deck.description || "Synthesize domain knowledge"}</p>
                </div>
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    if(confirm("Neural deletion is irreversible. Proceed?")) {
                      const { error } = await supabase.from('decks').delete().eq('id', deck.id);
                      if(!error) fetchData();
                    }
                  }}
                  className="text-muted p-1 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1.5 text-[11px] text-muted font-medium uppercase tracking-tight">
                   <div className="w-5 h-5 bg-primary-lighter rounded flex items-center justify-center">
                     <BookOpen size={10} className="text-primary" />
                   </div>
                   {deck.anchorCount} anchors
                </div>
                <Link href={`/study/${deck.id}`}>
                  <button className="btn-primary btn-sm px-5 py-1.5 font-bold">
                    Study
                  </button>
                </Link>
              </div>
            </motion.div>
          ))}
          {decks.length === 0 && (
            <div className="card text-center py-10 opacity-60 bg-secondary/30 border-dashed border-2">
              <p className="text-[13px] font-medium text-muted italic">Initialize a new cognitive domain...</p>
            </div>
          )}
        </div>
      </section>

      {/* Marketplace Entry */}
      <Link href="/marketplace" className="block animate-in fade-in slide-in-from-bottom-2 duration-500 delay-500">
        <div className="card bg-primary text-white border-transparent flex items-center justify-between hover:bg-primary-light transition-all shadow-[--shadow-glow-purple]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
              <ShoppingBag size={22} />
            </div>
            <div>
              <p className="text-[14px] font-bold">Ritual Marketplace</p>
              <p className="text-[11px] text-white/70">Aquire shared neural models</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-white/60" />
        </div>
      </Link>
    </div>
  );

  const renderCreateAnchor = () => (
    <div className="space-y-6 pb-24 max-w-[420px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="py-8">
        <p className="text-[10px] font-medium tracking-[0.13em] uppercase text-muted mb-1">New Connection</p>
        <h1 className="text-[26px] font-serif font-normal text-foreground leading-tight">Anchor Deep</h1>
      </header>

      <div className="card space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-muted uppercase tracking-tight ml-1">Domain</label>
          <div className="relative">
            <select 
              value={selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value)}
              className="field appearance-none pr-10"
            >
              <option value="" disabled>Select a domain...</option>
              {decks.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-muted pointer-events-none" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted uppercase tracking-tight ml-1">Conceptual Key</label>
            <input 
              value={newAnchor.word}
              onChange={(e) => setNewAnchor({...newAnchor, word: e.target.value})}
              className="field" 
              placeholder="e.g. Hebbian Learning"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted uppercase tracking-tight ml-1">Subtle Hint</label>
            <input 
              value={newAnchor.hint}
              onChange={(e) => setNewAnchor({...newAnchor, hint: e.target.value})}
              className="field shrink-0" 
              placeholder="Cells that fire together..."
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-muted uppercase tracking-tight ml-1">Keywords</label>
          <input 
            value={newAnchor.keywords}
            onChange={(e) => setNewAnchor({...newAnchor, keywords: e.target.value})}
            className="field font-mono text-[11px]" 
            placeholder="synapse, neurons, connection, reinforcing..."
          />
          <p className="text-[9px] text-muted italic ml-1 leading-relaxed">Comma-separated keys for semantic validation</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-muted uppercase tracking-tight ml-1">Reference Truth</label>
          <textarea 
            value={newAnchor.reference_answer}
            onChange={(e) => setNewAnchor({...newAnchor, reference_answer: e.target.value})}
            className="field min-h-[140px] resize-none leading-relaxed" 
            placeholder="Articulate the concept in exhaustive detail..."
          />
        </div>

        <button 
          onClick={handleCreateAnchor}
          disabled={!selectedDeckId || !newAnchor.word}
          className="btn-primary w-full py-4 rounded-[--radius-sm] text-[13px] font-bold uppercase tracking-widest mt-2 disabled:opacity-40"
        >
          Initialize Anchor
        </button>
      </div>

      {/* Guidance */}
      <div className="card bg-primary-lighter border-transparent flex items-start gap-4">
        <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
          <Zap size={16} className="text-primary fill-primary" />
        </div>
        <p className="text-[11px] leading-relaxed text-muted">
          <strong className="text-primary">Deep-context anchors</strong> are cognitive nodes that bind abstract concepts to specific retrieval cues. The AI Architect will use your reference truth to evaluate your neural synchronization during study rituals.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background relative selection:bg-primary/20">
      <main className="px-5 max-w-[420px] mx-auto min-h-screen pb-32">
        <AnimatePresence mode="wait">
          {activeTab === 'decks' && (
            <motion.div key="dashboard">
              {renderDashboard()}
            </motion.div>
          )}
          {activeTab === 'create' && (
            <motion.div key="create">
              {renderCreateAnchor()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Rail */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-3xl border-t border-border">
        <div className="max-w-[420px] mx-auto h-[72px] flex justify-around items-center px-4">
          {[
            { id: 'decks', icon: LayoutGrid, label: 'Decks' },
            { id: 'study', icon: Star, label: 'Study', onClick: () => {
              if (decks.length > 0) router.push(`/study/${decks[0].id}`);
              else setActiveTab('decks');
            }},
            { id: 'create', icon: Plus, label: 'Create' },
            { id: 'profile', icon: SettingsIcon, label: 'Settings', href: '/profile' },
          ].map((item) => (
            item.href ? (
              <Link key={item.id} href={item.href} className="group flex flex-col items-center gap-1 w-16">
                <div className={cn(
                  "w-12 h-8 rounded-2xl flex items-center justify-center transition-all",
                  "text-muted group-hover:text-foreground"
                )}>
                  <item.icon size={20} strokeWidth={1.8} />
                </div>
                <span className="text-[10px] font-medium text-muted group-hover:text-foreground">{item.label}</span>
              </Link>
            ) : (
              <button 
                key={item.id}
                onClick={item.onClick || (() => setActiveTab(item.id))}
                className={cn(
                  "group flex flex-col items-center gap-1 w-16 transition-all",
                  activeTab === item.id ? "text-primary" : "text-muted"
                )}
              >
                <div className={cn(
                  "w-12 h-[34px] rounded-full flex items-center justify-center transition-all",
                  activeTab === item.id ? "bg-primary text-white shadow-lg" : "group-hover:bg-secondary"
                )}>
                   <item.icon size={19} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                </div>
                <span className={cn("text-[10px]", activeTab === item.id ? "font-bold" : "font-medium")}>{item.label}</span>
              </button>
            )
          ))}
        </div>
      </nav>

      {/* Modal: New Deck */}
      {showNewDeckModal && (
        <div className="fixed inset-0 z-[110] bg-black/20 backdrop-blur-md flex items-center justify-center p-6">
          <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="w-full max-w-[400px] bg-card rounded-[--radius-lg] p-8 shadow-md border border-border relative">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-[20px] font-serif font-normal leading-none mb-1">New Ritual</h2>
                <p className="text-[11px] text-muted">Initialize a cognitive domain</p>
              </div>
              <button onClick={() => setShowNewDeckModal(false)} className="text-muted hover:text-foreground">✕</button>
            </div>

            <div className="space-y-5 mb-8">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted uppercase tracking-tight ml-1">Domain Title</label>
                <input 
                  value={newDeck.name}
                  onChange={(e) => setNewDeck({...newDeck, name: e.target.value})}
                  className="field py-4" 
                  placeholder="e.g. Cognitive Psychology" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted uppercase tracking-tight ml-1">Objective</label>
                <textarea 
                  value={newDeck.description}
                  onChange={(e) => setNewDeck({...newDeck, description: e.target.value})}
                  className="field min-h-[100px] resize-none leading-relaxed" 
                  placeholder="Define the scope and context..." 
                />
              </div>
            </div>
            
            <button 
              onClick={handleCreateDeck}
              disabled={!newDeck.name}
              className="btn-primary w-full py-4 text-[13px] font-bold uppercase tracking-widest disabled:opacity-40"
            >
              Start Domain
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
