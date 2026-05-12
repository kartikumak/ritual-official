'use client';

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, use } from "react";
import { ChevronLeft, Check, FastForward, RotateCcw, AlertCircle, Quote, BookOpen, History, Image as ImageIcon, Mic, Trash2, Play, Zap } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { useAuth } from "@/src/context/AuthContext";
import { getSupabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { MemoryFadeEngine } from "@/src/lib/algorithm";
import DrawingPad from "@/src/components/DrawingPad";
import VoiceRecorder from "@/src/components/VoiceRecorder";

export default function StudySession({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [anchors, setAnchors] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'input' | 'result' | 'complete'>('input');
  const [recallText, setRecallText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [deck, setDeck] = useState<any>(null);
  const [lastReview, setLastReview] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showDrawingPad, setShowDrawingPad] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);

  const supabase = getSupabase();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (user) startSession();
  }, [user, authLoading]);

  // Fetch last review whenever index changes or session starts
  useEffect(() => {
    if (anchors[index]) {
      fetchLastReview(anchors[index].id);
    }
  }, [index, anchors]);

  const fetchLastReview = async (anchorId: string) => {
    const { data } = await supabase
      .from('review_logs')
      .select('*')
      .eq('anchor_id', anchorId)
      .order('reviewed_at', { ascending: false })
      .limit(1);
    
    if (data && data.length > 0) {
      setLastReview(data[0]);
    } else {
      setLastReview(null);
    }
  };

  const startSession = async () => {
    setLoading(true);
    try {
      // 1. Fetch Deck
      const { data: deckData } = await supabase.from('decks').select('*').eq('id', deckId).single();
      setDeck(deckData);

      // 2. Fetch Due Anchors
      // Logic: Get all anchors for this deck, then join with progress
      const { data: anchorsData } = await supabase
        .from('anchors')
        .select('*, anchor_progress(*)')
        .eq('deck_id', deckId);

      // Filter: due now or new
      const now = new Date();
      const due = anchorsData?.filter(a => {
        if (!a.anchor_progress || a.anchor_progress.length === 0) return true;
        return new Date(a.anchor_progress[0].due_at) <= now;
      }) || [];

      // Sort by depth (i+1)
      const sorted = due.sort((a,b) => (a.anchor_progress?.[0]?.concept_depth || 0) - (b.anchor_progress?.[0]?.concept_depth || 0));

      if (sorted.length === 0) {
        setPhase('complete');
      } else {
        setAnchors(sorted);
        // Create session record
        if (user) {
          const { data: sess, error: sErr } = await supabase.from('sessions').insert({ user_id: user.id, deck_id: deckId }).select().single();
          if (sErr) console.error("Session creation error:", sErr);
          setSession(sess);
        }
      }
    } catch (err: any) {
      console.error("Session start error:", err);
      alert("Failed to start session: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const current = anchors[index];
    
    try {
      const resp = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          anchor_id: current.id,
          text: recallText,
          session_id: session?.id,
          drawing_json: currentDrawing,
          audio_url: currentAudio
        })
      });
      
      const data = await resp.json();
      if (data.error) throw new Error(data.error);

      setResult(data);
      setPhase('result');
    } catch (err: any) {
      console.error("Evaluation error:", err);
      alert('Evaluation failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextAnchor = () => {
    if (index + 1 >= anchors.length) {
      completeSession();
    } else {
      setIndex(prev => prev + 1);
      setRecallText("");
      setPhase('input');
      setResult(null);
    }
  };

  const completeSession = async () => {
    if (session?.id) {
       const { error } = await supabase.from('sessions').update({ ended_at: new Date().toISOString() }).eq('id', session.id);
       if (error) console.error("Session closure error:", error);
    }
    setPhase('complete');
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (phase === 'complete') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center bg-background">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-6">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={48} className="text-primary" strokeWidth={3} />
          </div>
          <h2 className="text-3xl font-serif font-bold">Session Complete</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px]">
             {anchors.length > 0 
               ? `You've successfully addressed ${anchors.length} anchors in your ${deck?.name} collection.` 
               : `No anchors are currently due for review in this collection.`}
          </p>
          <button 
            onClick={() => router.push('/')}
            className="w-full h-14 bg-primary text-white font-bold rounded-2xl shadow-lg ring-offset-2 active:scale-95 transition-all mt-4"
          >
            Return to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  const currentAnchor = anchors[index];
  const progress = currentAnchor.anchor_progress?.[0] || {};

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground overflow-hidden">
      {/* Immersive Background Blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[140px] animate-blob" />
        <div className="absolute bottom-[0%] left-[-10%] w-[50%] h-[50%] bg-secondary/5 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '5s' }} />
      </div>

      {/* Top Navigation */}
      <div className="px-8 pt-12 pb-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-5">
          <button 
            onClick={() => router.push('/')} 
            className="w-14 h-14 rounded-[2rem] bg-card shadow-neumorphic flex items-center justify-center text-muted-foreground hover:text-primary transition-all border border-white/5 active:scale-95"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground/30">Ritual Mastery</p>
            <h2 className="text-xl font-serif font-black tracking-tight">{deck?.name}</h2>
          </div>
        </div>
        <div className="w-24 h-14 rounded-[2rem] bg-card shadow-neumorphic flex items-center justify-center text-primary border border-white/5 relative group">
          <span className="text-sm font-black tracking-tight">{index + 1}</span>
          <span className="text-[10px] font-black text-muted-foreground/30 mx-1">/</span>
          <span className="text-[10px] font-black text-muted-foreground/30">{anchors.length}</span>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-primary rounded-full blur-[4px] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Progress Track */}
      <div className="px-10 mb-10">
        <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden p-1 shadow-inner">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${((index + 1) / anchors.length) * 100}%` }}
            className="h-full bg-primary rounded-full shadow-glow"
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="px-4 sm:px-8 flex-1 flex flex-col max-w-4xl mx-auto w-full relative z-10 transition-all">
        <AnimatePresence mode="wait">
          {phase === 'input' ? (
            <motion.div key="input" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.05, y: -20 }} className="flex-1 flex flex-col">
              {/* Anchor Card */}
              <div className="relative p-8 sm:p-12 md:p-16 rounded-[3rem] sm:rounded-[4rem] bg-card border border-white/5 shadow-neumorphic mb-8 sm:mb-12 overflow-hidden group transition-all min-h-[300px] md:min-h-[400px] flex flex-col justify-center">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[60px] -translate-y-1/3 translate-x-1/4 animate-blob" />
                <div className="relative space-y-6 sm:space-y-10">
                  <div className="flex flex-col items-center text-center">
                    <div className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/10 shadow-sm text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-4 sm:mb-8">
                       Neural Depth: {progress.concept_depth || 0}
                    </div>
                    <h2 className="text-4xl sm:text-5xl md:text-7xl font-serif font-black mb-4 sm:mb-8 text-foreground tracking-tighter leading-[0.95]">{currentAnchor.word}</h2>
                    {currentAnchor.hint && (
                      <div className="flex items-center gap-4 text-muted-foreground/50 bg-white/5 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 group-hover:border-primary/10 transition-colors max-w-lg mx-auto">
                        <Quote size={18} className="rotate-180 opacity-20 shrink-0 text-primary hidden sm:block" />
                        <p className="text-xs sm:text-sm font-bold leading-relaxed">{currentAnchor.hint}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cognitive Assistance (Memory Fade) */}
                {lastReview && (
                  <div className="mt-8 pt-6 border-t border-white/5 relative z-10">
                    <button 
                      onClick={() => setShowHistory(!showHistory)}
                      className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 hover:text-primary transition-colors mb-4"
                    >
                      <History size={14} />
                      {showHistory ? "Seal Memory" : "Resurface Echo"}
                    </button>
                    <AnimatePresence>
                      {showHistory && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className={cn(
                            "text-sm leading-relaxed italic border-l-[3px] border-primary/40 pl-6 py-3 overflow-hidden font-medium text-muted-foreground/60",
                            MemoryFadeEngine.getFadeClass(progress.repetitions || 0)
                          )}
                        >
                          "{lastReview.response_text}"
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="flex-1 flex flex-col gap-6">
                <div className="flex items-center justify-between px-4">
                  <span className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">Neural Output</span>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setShowDrawingPad(true)}
                      className={cn(
                        "w-12 h-12 rounded-[1.2rem] transition-all relative flex items-center justify-center shadow-neumorphic border border-white/5 active:scale-90",
                        currentDrawing ? "bg-accent/10 border-accent/20 text-accent" : "bg-card text-muted-foreground hover:text-primary"
                      )} 
                      title="Add Concept Drawing"
                    >
                      <ImageIcon size={20} />
                      {currentDrawing && <div className="absolute top-0 right-0 w-3 h-3 bg-accent rounded-full border-2 border-card shadow-lg" />}
                    </button>
                    <button 
                      onClick={() => setShowVoiceRecorder(true)}
                      className={cn(
                        "w-12 h-12 rounded-[1.2rem] transition-all relative flex items-center justify-center shadow-neumorphic border border-white/5 active:scale-90",
                        currentAudio ? "bg-accent/10 border-accent/20 text-accent" : "bg-card text-muted-foreground hover:text-primary"
                      )} 
                      title="Dictate Thought"
                    >
                      <Mic size={20} />
                      {currentAudio && <div className="absolute top-0 right-0 w-3 h-3 bg-accent rounded-full border-2 border-card shadow-lg" />}
                    </button>
                  </div>
                </div>

                <div className="relative group flex-1 flex flex-col min-h-[180px]">
                  <textarea 
                    value={recallText}
                    onChange={(e) => setRecallText(e.target.value)}
                    placeholder="Retrieve concept from neural memory..."
                    className="w-full flex-1 bg-card shadow-neumorphic-inset border border-white/5 rounded-[3rem] p-8 text-lg font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all resize-none placeholder:text-muted-foreground/10 text-foreground"
                    autoFocus
                  />
                  <div className="absolute bottom-6 right-8 text-[10px] font-black text-muted-foreground/20 italic tracking-widest px-4 py-1 rounded-full bg-white/5">
                    {recallText.length} Tokens
                  </div>
                </div>

                {(currentDrawing || currentAudio) && (
                  <div className="flex gap-6 px-4">
                    {currentDrawing && (
                      <div className="relative group flex-1 h-24">
                        <img src={currentDrawing} alt="Draft drawing" className="w-full h-full object-contain bg-white/5 rounded-[1.5rem] border border-white/5" />
                        <button 
                          onClick={() => setCurrentDrawing(null)}
                          className="absolute -top-2 -right-2 w-8 h-8 bg-rose-500 text-white rounded-xl shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                    {currentAudio && (
                      <div className="relative group flex-1 h-24 flex items-center justify-center bg-accent/5 rounded-[1.5rem] border border-accent/10">
                        <Play size={24} className="text-accent cursor-pointer hover:scale-110 transition-transform" fill="currentColor" onClick={() => new Audio(currentAudio).play()} />
                        <button 
                          onClick={() => setCurrentAudio(null)}
                          className="absolute -top-2 -right-2 w-8 h-8 bg-rose-500 text-white rounded-xl shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button 
                  onClick={handleEvaluate}
                  disabled={!recallText || isSubmitting}
                  className="w-full h-20 bg-primary text-white font-black rounded-[2.5rem] shadow-glow flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-30 disabled:grayscale uppercase tracking-[0.2em] text-sm group mb-12"
                >
                  {isSubmitting ? (
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Zap size={20} fill="currentColor" className="group-hover:scale-125 transition-transform" />
                      Synchronize Pulse
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="space-y-8 pb-32">
              {/* Scoring Card */}
              <div className={cn(
                "p-8 sm:p-12 md:p-16 rounded-[3rem] sm:rounded-[4rem] border shadow-neumorphic relative overflow-hidden",
                result.evalResult.level === 'strong' ? "bg-accent/5 border-accent/20" : 
                result.evalResult.level === 'medium' ? "bg-amber-500/5 border-amber-500/20" : "bg-rose-500/5 border-rose-500/20"
              )}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                
                <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 mb-10 sm:mb-14 relative z-10 text-center sm:text-left">
                  <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-[2rem] bg-card shadow-neumorphic flex items-center justify-center text-5xl sm:text-7xl shrink-0">
                    {result.evalResult.emoji}
                  </div>
                  <div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black tracking-tight mb-2 leading-none">{result.evalResult.label}</h2>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-40">{result.evalResult.sublabel}</p>
                  </div>
                </div>

                <div className="p-8 bg-card/50 backdrop-blur-xl rounded-[2.5rem] border border-white/5 shadow-inner relative z-10">
                   <p className="text-lg font-serif font-black text-foreground italic leading-relaxed">
                      {result.evalResult.correction}
                   </p>
                </div>

                {/* Evolution Tracking */}
                {lastReview && (
                  <div className="mt-10 pt-10 border-t border-white/5 relative z-10">
                    <div className="flex items-center justify-between mb-6">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">Neural Evolution</h4>
                       <span className={cn(
                         "text-[10px] font-black px-4 py-1.5 rounded-full shadow-glow",
                         result.evalResult.score > lastReview.score ? "bg-accent/10 text-accent border border-accent/20" : "bg-white/5 text-muted-foreground/40 border border-white/5"
                       )}>
                         {result.evalResult.score > lastReview.score ? `+${result.evalResult.score - lastReview.score}% Depth` : 'Equilibrium'}
                       </span>
                    </div>
                    <div className="grid grid-cols-2 gap-8 bg-white/5 p-8 rounded-[3rem] border border-white/5">
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-muted-foreground/20 uppercase tracking-[0.2em]">Legacy Echo</p>
                        <p className="text-sm border-l-2 border-white/5 pl-4 py-1 opacity-40 italic">{lastReview.response_text}</p>
                      </div>
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-muted-foreground/20 uppercase tracking-[0.2em]">Active Pulse</p>
                        <p className="text-sm border-l-2 border-primary/40 pl-4 py-1 font-bold text-foreground">{recallText}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SRS Meta Widgets */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                {[
                  { label: 'Depth', value: result.depthLabel, icon: Zap, color: 'text-primary' },
                  { label: 'Cycle', value: `+${result.newSRS.interval_days}d`, icon: History, color: 'text-accent' },
                  { label: 'Recall', value: new Date(result.nextDue || result.newSRS.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), icon: BookOpen, color: 'text-muted-foreground' }
                ].map((stat) => (
                  <div key={stat.label} className="p-5 sm:p-8 bg-card border border-white/5 rounded-[2.5rem] shadow-neumorphic text-center space-y-2 sm:space-y-4">
                    <div className={cn("w-10 h-10 rounded-xl sm:rounded-2xl bg-white/5 flex items-center justify-center mx-auto", stat.color)}>
                      <stat.icon size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground/30 font-black uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                      <p className="text-sm font-black text-foreground">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Retrieval Analysis */}
              <div className="p-10 bg-card border border-white/5 rounded-[3.5rem] shadow-neumorphic">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 mb-8">Neural Pathway Analysis</h3>
                <div 
                  dangerouslySetInnerHTML={{ __html: result.evalResult.highlightedHtml }} 
                  className="text-xl font-serif font-black leading-relaxed text-foreground mb-10 bg-white/5 p-8 rounded-[2.5rem] border border-white/5"
                />
                <div className="flex flex-wrap gap-3">
                  {result.evalResult.hitKeywords.map((kw: string) => (
                    <span key={kw} className="px-5 py-2 bg-accent/10 text-accent rounded-full text-[10px] font-black uppercase tracking-widest border border-accent/20 shadow-glow">✓ {kw}</span>
                  ))}
                  {result.evalResult.missKeywords.map((kw: string) => (
                    <span key={kw} className="px-5 py-2 bg-rose-500/10 text-rose-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-500/20">✗ {kw}</span>
                  ))}
                </div>
              </div>

              {/* Reference Fragment */}
              <div className="p-10 bg-primary/5 border border-primary/10 rounded-[3.5rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.05] scale-150 transform translate-x-8 -translate-y-8"><BookOpen size={140} /></div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-6 relative z-10">Canonical Ritual Source</h3>
                <p className="text-2xl font-serif font-black leading-tight text-foreground italic relative z-10">
                  "{currentAnchor.reference_answer}"
                </p>
              </div>

              {/* Action Grid */}
              <div className="flex gap-6 pt-10">
                <button 
                  onClick={() => setPhase('input')}
                  className="w-24 h-24 rounded-[2.5rem] bg-card border border-white/5 shadow-neumorphic flex flex-col items-center justify-center gap-2 hover:text-primary transition-all active:scale-90 text-muted-foreground group"
                >
                  <RotateCcw size={24} className="group-hover:rotate-[-180deg] transition-transform duration-500" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Redo</span>
                </button>
                <button 
                  onClick={nextAnchor}
                  className="flex-1 flex items-center justify-center gap-4 h-24 rounded-[2.5rem] bg-primary text-white font-black text-lg shadow-glow active:scale-[0.98] transition-all uppercase tracking-[0.2em] group"
                >
                  Proceed to Next Anchor
                  <FastForward size={24} className="group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showDrawingPad && (
        <DrawingPad 
          onSave={(data) => {
            setCurrentDrawing(data);
            setShowDrawingPad(false);
          }}
          onClose={() => setShowDrawingPad(false)}
        />
      )}
      {showVoiceRecorder && (
        <VoiceRecorder 
          onSave={(url) => {
            setCurrentAudio(url);
            setShowVoiceRecorder(false);
          }}
          onClose={() => setShowVoiceRecorder(false)}
        />
      )}
    </div>
  );
}
