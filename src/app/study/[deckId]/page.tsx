'use client';

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, use } from "react";
import { ChevronLeft, Check, FastForward, RotateCcw, AlertCircle, Quote, BookOpen, History, Image as ImageIcon, Mic, Trash2, Play } from "lucide-react";
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
        const { data: sess } = await supabase.from('sessions').insert({ user_id: user?.id, deck_id: deckId }).select().single();
        setSession(sess);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
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
    } catch (err) {
      console.error(err);
      alert('Evaluation failed. Check logs.');
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
    const results = anchors.map((a, i) => i <= index); // Mocking results collection for now
    await supabase.from('sessions').update({ ended_at: new Date().toISOString() }).eq('id', session?.id);
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
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top Navigation */}
      <div className="px-6 pt-12 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center hover:bg-muted/30 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Anchoring Progress</p>
            <p className="text-lg font-bold">{index + 1} / {anchors.length}</p>
          </div>
        </div>
        <div className="text-[10px] font-bold py-1 px-3 bg-primary/5 text-primary rounded-full border border-primary/10">
          {deck?.name}
        </div>
      </div>

      {/* Progress Track */}
      <div className="px-6 mb-8">
        <div className="h-1.5 w-full bg-muted/10 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${((index + 1) / anchors.length) * 100}%` }}
            className="h-full bg-primary"
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <div className="px-6 flex-1 flex flex-col max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {phase === 'input' ? (
            <motion.div key="input" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
              {/* Anchor Card */}
              <div className="relative p-7 md:p-10 rounded-[2.5rem] bg-card border border-white/60 shadow-neumorphic mb-6 overflow-hidden group transition-all">
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/20 transition-colors duration-700 animate-blob" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-muted-foreground">{currentAnchor.level}</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                    <span className="px-3 py-1 rounded-full bg-primary/5 border border-primary/10 shadow-sm text-primary text-[9px] font-bold uppercase tracking-wide">
                       Depth: {progress.concept_depth || 0}
                    </span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-foreground tracking-tight leading-tight">{currentAnchor.word}</h2>
                  {currentAnchor.hint && (
                    <div className="flex items-center gap-3 text-muted-foreground/80 bg-muted/20 p-4 rounded-2xl border border-border/50">
                      <Quote size={14} className="rotate-180 opacity-40 shrink-0 text-primary" />
                      <p className="text-sm italic font-medium leading-relaxed">{currentAnchor.hint}</p>
                    </div>
                  )}
                </div>

                {/* Cognitive Assistance (Memory Fade) */}
                {lastReview && (
                  <div className="mt-6 pt-6 border-t border-border/40">
                    <button 
                      onClick={() => setShowHistory(!showHistory)}
                      className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-primary transition-colors mb-4"
                    >
                      <History size={12} />
                      {showHistory ? "Hide Previous Context" : "Expose Previous Context"}
                    </button>
                    <AnimatePresence>
                      {showHistory && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className={cn(
                            "text-sm leading-relaxed italic border-l-[3px] border-primary/20 pl-5 py-2 overflow-hidden",
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
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center justify-between ml-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Perform Retrieval</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowDrawingPad(true)}
                      className={cn(
                        "p-2.5 rounded-[1rem] transition-all relative shadow-sm border",
                        currentDrawing ? "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-emerald-100" : "bg-white border-white/60 text-muted-foreground hover:text-primary hover:shadow-neumorphic"
                      )} 
                      title="Add Concept Drawing"
                    >
                      <ImageIcon size={16} />
                      {currentDrawing && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />}
                    </button>
                    <button 
                      onClick={() => setShowVoiceRecorder(true)}
                      className={cn(
                        "p-2.5 rounded-[1rem] transition-all relative shadow-sm border",
                        currentAudio ? "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-emerald-100" : "bg-white border-white/60 text-muted-foreground hover:text-primary hover:shadow-neumorphic"
                      )} 
                      title="Dictate Thought"
                    >
                      <Mic size={16} />
                      {currentAudio && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />}
                    </button>
                  </div>
                </div>

                <textarea 
                  value={recallText}
                  onChange={(e) => setRecallText(e.target.value)}
                  placeholder="Articulate everything you associate with this concept. Use your own words to strengthen the neural pathway."
                  className="flex-1 w-full p-6 lg:p-8 rounded-[2.5rem] bg-white border border-white/60 shadow-neumorphic-inset focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none text-sm md:text-base leading-relaxed text-foreground placeholder:text-muted-foreground/50"
                  autoFocus
                />

                {(currentDrawing || currentAudio) && (
                  <div className="flex gap-4">
                    {currentDrawing && (
                      <div className="relative group flex-1">
                        <img src={currentDrawing} alt="Draft drawing" className="w-full h-24 object-contain bg-white rounded-xl border border-border" />
                        <button 
                          onClick={() => setCurrentDrawing(null)}
                          className="absolute top-2 right-2 p-1 bg-rose-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    )}
                    {currentAudio && (
                      <div className="relative group flex-1 flex items-center justify-center bg-emerald-50 rounded-xl border border-emerald-100 h-24">
                        <Play size={20} className="text-emerald-600" fill="currentColor" onClick={() => new Audio(currentAudio).play()} />
                        <button 
                          onClick={() => setCurrentAudio(null)}
                          className="absolute top-2 right-2 p-1 bg-rose-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button 
                  onClick={handleEvaluate}
                  disabled={!recallText || isSubmitting}
                  className="w-full h-14 bg-primary text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50 ring-offset-2 flex items-center justify-center gap-3"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check size={18} strokeWidth={3} />
                      Verify Retrieval
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 pb-20 overflow-y-auto max-h-[70vh]">
              {/* Scoring Card */}
              <div className={cn(
                "p-7 md:p-10 rounded-[2.5rem] border shadow-neumorphic relative overflow-hidden",
                result.evalResult.level === 'strong' ? "bg-emerald-50/50 border-emerald-100" : 
                result.evalResult.level === 'medium' ? "bg-amber-50/50 border-amber-100" : "bg-rose-50/50 border-rose-100"
              )}>
                <div className="flex items-center gap-6 mb-6">
                  <span className="text-6xl drop-shadow-md animate-breathe inline-block">{result.evalResult.emoji}</span>
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight mb-1">{result.evalResult.label}</h2>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{result.evalResult.sublabel}</p>
                  </div>
                </div>
                <div className="p-5 bg-white/60 backdrop-blur-md rounded-2xl border border-white/80 shadow-sm">
                   <pre className="text-sm font-sans text-muted-foreground leading-relaxed whitespace-pre-wrap font-medium">
                      {result.evalResult.correction}
                   </pre>
                </div>

                {/* Evolution Tracking */}
                {lastReview && (
                  <div className="mt-8 pt-6 border-t border-black/5">
                    <div className="flex items-center justify-between mb-4">
                       <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Conceptual Evolution</h4>
                       <span className={cn(
                         "text-[9px] font-bold px-3 py-1 rounded-full shadow-sm",
                         result.evalResult.score > lastReview.score ? "bg-emerald-100/50 text-emerald-700 border border-emerald-200/50" : "bg-muted/50 text-muted-foreground border border-border"
                       )}>
                         {result.evalResult.score > lastReview.score ? `+${result.evalResult.score - lastReview.score}% Depth` : 'Stable'}
                       </span>
                    </div>
                    <div className="grid grid-cols-2 gap-6 bg-white/40 p-5 rounded-2xl border border-white/60">
                      <div className="space-y-2">
                        <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider">Previous Memory</p>
                        <p className="text-xs leading-relaxed opacity-60 italic">{lastReview.response_text}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider">Current Memory</p>
                        <p className="text-xs leading-relaxed font-medium">{recallText}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SRS Meta */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-5 bg-white/60 backdrop-blur-sm border border-white/80 rounded-[2rem] shadow-neumorphic text-center">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2">Depth</p>
                  <p className="text-sm font-bold text-primary">{result.depthLabel}</p>
                </div>
                <div className="p-5 bg-white/60 backdrop-blur-sm border border-white/80 rounded-[2rem] shadow-neumorphic text-center">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2">Interval</p>
                  <p className="text-sm font-bold">+{result.newSRS.interval_days}d</p>
                </div>
                <div className="p-5 bg-white/60 backdrop-blur-sm border border-white/80 rounded-[2rem] shadow-neumorphic text-center">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2">Due</p>
                  <p className="text-sm font-bold truncate px-1">{new Date(result.nextDue || result.newSRS.due_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Retrieval Feedback */}
              <div className="p-7 md:p-8 bg-card border border-white/60 rounded-[2rem] shadow-neumorphic">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-5">Retrieval Analysis</h3>
                <div 
                  dangerouslySetInnerHTML={{ __html: result.evalResult.highlightedHtml }} 
                  className="text-base leading-relaxed text-foreground mb-8 bg-white/50 p-6 rounded-2xl border border-white/80 shadow-sm"
                />
                <div className="flex flex-wrap gap-2.5">
                  {result.evalResult.hitKeywords.map((kw: string) => (
                    <span key={kw} className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200/50 shadow-sm">✓ {kw}</span>
                  ))}
                  {result.evalResult.missKeywords.map((kw: string) => (
                    <span key={kw} className="px-3.5 py-1.5 bg-rose-50 text-rose-600 rounded-full text-xs font-bold border border-rose-200/50 shadow-sm">✗ {kw}</span>
                  ))}
                </div>
              </div>

              {/* Reference */}
              <div className="p-8 bg-primary/5 border border-primary/10 rounded-[2rem] shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] scale-150 transform translate-x-4 -translate-y-4"><BookOpen size={120} /></div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-4 relative z-10">Ground Truth Reference</h3>
                <p className="text-base leading-relaxed text-primary/80 font-medium italic relative z-10">
                  "{currentAnchor.reference_answer}"
                </p>
              </div>

              {/* Navigation */}
              <div className="flex gap-4 pt-6">
                <button 
                  onClick={() => setPhase('input')}
                  className="flex items-center justify-center gap-2 px-8 h-14 rounded-2xl bg-white border border-white/60 shadow-neumorphic hover:text-primary transition-colors font-bold text-sm"
                >
                  <RotateCcw size={18} />
                  Redo
                </button>
                <button 
                  onClick={nextAnchor}
                  className="flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl bg-primary text-white font-bold text-sm shadow-lg active:scale-95 transition-transform"
                >
                  Proceed
                  <FastForward size={18} />
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
