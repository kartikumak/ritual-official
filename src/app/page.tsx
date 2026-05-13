'use client';

import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Star, Plus, Settings as SettingsIcon, LayoutGrid, LogOut, Download, Upload, Trash2, AlertCircle, TrendingUp, ShoppingBag, User, ChevronRight, Search, Zap, CloudLightning, Bell, ChevronLeft } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn, getInitials } from "@/src/lib/utils";
import { useAuth } from "@/src/context/AuthContext";
import { getSupabase } from "@/src/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell } from 'recharts';
import SocialHub from "@/src/components/social/SocialHub";

export default function Home() {
  const { user, signOut, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("social");
  const [profile, setProfile] = useState<any>(null);
  const [decks, setDecks] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, weekly: 0 });
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [showNewDeckModal, setShowNewDeckModal] = useState(false);
  const [newDeck, setNewDeck] = useState({ name: '', description: '', category: 'General', is_public: false });
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
      console.log("Fetching profile for user:", user.id);
      let { data: profileData, error: pErr } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      
      if (pErr) {
        console.warn("Profile fetch error:", pErr);
        if (pErr.code === 'PGRST116' || pErr.message.includes('multiple rows') || pErr.message.includes('not found')) {
          console.log("Profile not found, attempting to create...");
          const { data: newProfile, error: createErr } = await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Explorer'
          }).select().single();
          
          if (createErr) {
            console.error("Profile creation failed:", createErr);
            setDbError(`Profile initialization failed: ${createErr.message}`);
          } else {
            console.log("Profile created successfully");
            profileData = newProfile;
          }
        } else {
          setDbError(`Database error: ${pErr.message}`);
        }
      }

      if (profileData) {
        setProfile(profileData);
      }

      // 2. Decks
      console.log("Fetching decks...");
      const { data: decksData, error: dErr } = await supabase
        .from('decks')
        .select('*, anchors(id)')
        .eq('user_id', user.id);
      
      if (dErr) {
        console.error("Decks fetch error:", dErr);
      } else {
        console.log("Decks fetched:", decksData?.length || 0);
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
      category: newDeck.category,
      is_public: newDeck.is_public
    });
    
    if (error) {
      console.error("Error creating deck:", error);
      alert(`Synthesis Failed: ${error.message}`);
    } else {
      setShowNewDeckModal(false);
      setNewDeck({ name: '', description: '', category: 'General', is_public: false });
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
    <div className="space-y-8 pb-24 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* App Header */}
      <header className="flex items-center justify-between py-10 px-0">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted mb-1">Welcome back</p>
          <h1 className="text-3xl md:text-4xl font-serif font-normal text-foreground leading-tight tracking-tight">{profile?.display_name || profile?.name || "Explorer"}</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="w-[50px] h-[50px] rounded-full bg-secondary text-muted flex items-center justify-center hover:text-foreground transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-accent-orange rounded-full border-2 border-background"></span>
          </button>
          <Link href="/profile" className="w-[50px] h-[50px] rounded-full bg-primary-lighter text-primary font-bold flex items-center justify-center text-lg shrink-0 hover:bg-primary-light transition-all shadow-sm overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              getInitials(profile?.display_name || profile?.name || user?.email || "E")
            )}
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card-md animate-in fade-in slide-in-from-bottom-2 duration-500 delay-75">
              <p className="text-[11px] text-muted mb-2 font-bold uppercase tracking-wider">Total Reviewed</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary leading-none">{stats.total}</span>
                <span className="text-xs text-muted font-medium">anchors</span>
              </div>
            </div>
            <div className="card-md animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
              <p className="text-[11px] text-muted mb-2 font-bold uppercase tracking-wider">Active Decks</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-foreground leading-none">{decks.length}</span>
                <span className="text-xs text-muted font-medium">collections</span>
              </div>
            </div>
          </div>

          {/* Activity Graph */}
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-bold text-foreground">Activity</span>
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
              <div className="h-[200px] w-full">
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
                        borderRadius: '18px', 
                        border: '1px solid var(--color-border)', 
                        background: 'var(--color-card)',
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
        </div>

        <div className="space-y-6">
          {/* Weekly Progress */}
          <div className="animate-in fade-in slide-in-from-right-2 duration-500 delay-300">
            <div className="card h-full flex flex-col justify-center">
              <p className="text-sm font-bold text-foreground mb-6">Weekly Goal</p>
              <div className="flex items-center gap-6">
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="40" cy="40" r="34" className="fill-none stroke-secondary stroke-[8px]" />
                    <motion.circle 
                      cx="40" cy="40" r="34" 
                      className="fill-none stroke-primary stroke-[8px] stroke-round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: Math.min(1, stats.weekly / (profile?.weekly_goal || 140)) }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{Math.round((stats.weekly / (profile?.weekly_goal || 140)) * 100)}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary leading-none mb-1.5">{stats.weekly} <span className="text-sm text-muted font-medium">/ {profile?.weekly_goal || 140}</span></div>
                  <p className="text-[10px] text-muted uppercase font-bold tracking-widest leading-tight">anchors anchored this week</p>
                </div>
              </div>
            </div>
          </div>

          {/* Marketplace Entry */}
          <Link href="/marketplace" className="block animate-in fade-in slide-in-from-right-2 duration-500 delay-500">
            <div className="card bg-primary text-white border-transparent flex items-center justify-between hover:bg-primary-light transition-all shadow-[--shadow-glow-purple] py-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                  <ShoppingBag size={26} />
                </div>
                <div>
                  <p className="text-base font-bold">Ritual Library</p>
                  <p className="text-xs text-white/70">Acquire community models</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-white/60" />
            </div>
          </Link>
        </div>
      </div>

          {/* Decks Section */}
      <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-400">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-foreground">My Virtual Models</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('create')}
              className="btn-outline btn-sm px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2"
            >
              <Plus size={14} /> Add Concept
            </button>
            <button 
              onClick={() => setShowNewDeckModal(true)}
              className="btn-primary btn-sm px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2"
            >
              <Plus size={14} /> New Deck
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck, i) => (
            <motion.div 
              key={deck.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.05 }}
              className="card-md group relative overflow-hidden h-full flex flex-col border-l-[4px] border-l-primary"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="max-w-[80%]">
                  <h3 className="text-base font-bold text-foreground leading-tight line-clamp-1">{deck.name}</h3>
                  <p className="text-xs text-muted mt-1 line-clamp-2">{deck.description || "Structured domain synthesis"}</p>
                </div>
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    if(confirm("Neural deletion is irreversible. Proceed?")) {
                      const { error } = await supabase.from('decks').delete().eq('id', deck.id);
                      if(!error) fetchData();
                    }
                  }}
                  className="text-muted p-2 hover:text-accent-orange transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="mt-auto flex items-center justify-between pt-4 border-t border-border">
                <div className="badge-primary px-3 py-1">
                  <BookOpen size={12} className="mr-1.5" />
                  {deck.anchorCount} Anchors
                </div>
                <Link href={`/study/${deck.id}`}>
                  <button className="btn-primary btn-sm px-6 py-2 font-bold uppercase tracking-wider text-[10px]">
                    Study
                  </button>
                </Link>
              </div>
            </motion.div>
          ))}
          {decks.length === 0 && (
            <div className="col-span-full card-lg border-dashed border-2 bg-muted-bg/50 flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted-bg flex items-center justify-center mb-4 text-muted">
                <LayoutGrid size={32} />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">No Decks Manifested</h3>
              <p className="text-sm text-muted">Begin your mastery path by creating a new ritual domain.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );

  const renderCreateAnchor = () => (
    <div className="space-y-6 pb-24 max-w-[420px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="py-8 relative">
        <button 
          onClick={() => setActiveTab('decks')}
          className="absolute -left-12 top-9 w-10 h-10 rounded-full bg-secondary text-muted hover:text-primary transition-all flex items-center justify-center hidden md:flex"
        >
          <ChevronLeft size={20} className="-ml-0.5" />
        </button>
        <p className="text-[10px] font-medium tracking-[0.13em] uppercase text-muted mb-1 flex items-center gap-2">
          <button onClick={() => setActiveTab('decks')} className="md:hidden text-primary">← Back</button>
          New Connection
        </p>
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
      <main className="px-5 max-w-7xl mx-auto min-h-screen pb-32">
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
          {activeTab === 'social' && (
            <motion.div key="social">
              <SocialHub userId={user?.id || ''} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Rail */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-3xl border-t border-border">
        <div className="max-w-4xl mx-auto h-[64px] pb-safe flex justify-around items-center px-4 md:px-12">
          {[
            { id: 'social', icon: CloudLightning, label: 'Community' },
            { id: 'decks', icon: LayoutGrid, label: 'Library' },
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
                onClick={() => setActiveTab(item.id)}
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
