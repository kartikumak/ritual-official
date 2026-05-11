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
      const resp = await fetch('/api/recall/evaluate', {
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
              <div className="relative p-7 md:p-10 rounded-[2rem] bg-card border border-border shadow-xl mb-6 overflow-hidden group transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-primary/10 transition-colors" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-muted-foreground">{currentAnchor.level}</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-wide">
                       Depth: {progress.concept_depth || 0}
                    </span>
                  </div>
                  <h2 className="text-4xl font-serif font-bold mb-3 text-foreground tracking-tight">{currentAnchor.word}</h2>
                  {currentAnchor.hint && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Quote size={12} className="rotate-180 opacity-50" />
                      <p className="text-xs italic">{currentAnchor.hint}</p>
                    </div>
                  )}
                </div>

                {/* Cognitive Assistance (Memory Fade) */}
                {lastReview && (
                  <div className="mt-4 pt-4 border-t border-border/40">
                    <button 
                      onClick={() => setShowHistory(!showHistory)}
                      className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-primary transition-colors"
                    >
                      <History size={12} />
                      Previous Perception
                    </button>
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className={cn(
                        "mt-2 text-xs leading-relaxed italic border-l-2 border-primary/20 pl-4 py-1",
                        MemoryFadeEngine.getFadeClass(progress.repetitions || 0)
                      )}
                    >
                      {lastReview.response_text}
                    </motion.div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Perform Retrieval</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowDrawingPad(true)}
                      className={cn(
                        "p-2 rounded-lg border transition-all relative",
                        currentDrawing ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-card border-border text-muted-foreground hover:text-primary"
                      )} 
                      title="Add Drawing"
                    >
                      <ImageIcon size={14} />
                      {currentDrawing && <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white" />}
                    </button>
                    <button 
                      onClick={() => setShowVoiceRecorder(true)}
                      className={cn(
                        "p-2 rounded-lg border transition-all relative",
                        currentAudio ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-card border-border text-muted-foreground hover:text-primary"
                      )} 
                      title="Record Audio"
                    >
                      <Mic size={14} />
                      {currentAudio && <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white" />}
                    </button>
                  </div>
                </div>

                <textarea 
                  value={recallText}
                  onChange={(e) => setRecallText(e.target.value)}
                  placeholder="Articulate everything you associate with this concept. Use your own words to strengthen the neural pathway."
                  className="flex-1 w-full p-6 rounded-2xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none text-sm leading-relaxed"
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
                "p-7 rounded-[2.5rem] border shadow-xl relative overflow-hidden",
                result.evalResult.level === 'strong' ? "bg-emerald-50 border-emerald-100" : 
                result.evalResult.level === 'medium' ? "bg-amber-50 border-amber-100" : "bg-rose-50 border-rose-100"
              )}>
                <div className="flex items-center gap-5 mb-5">
                  <span className="text-5xl drop-shadow-sm">{result.evalResult.emoji}</span>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">{result.evalResult.label}</h2>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{result.evalResult.sublabel}</p>
                  </div>
                </div>
                <div className="p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-black/5">
                   <pre className="text-xs font-sans text-muted-foreground leading-relaxed whitespace-pre-wrap font-medium">
                      {result.evalResult.correction}
                   </pre>
                </div>

                {/* Evolution Tracking */}
                {lastReview && (
                  <div className="mt-4 pt-4 border-t border-black/5">
                    <div className="flex items-center justify-between mb-2">
                       <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Conceptual Evolution</h4>
                       <span className={cn(
                         "text-[9px] font-bold px-2 py-0.5 rounded-full",
                         result.evalResult.score > lastReview.score ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                       )}>
                         {result.evalResult.score > lastReview.score ? `+${result.evalResult.score - lastReview.score}% Depth` : 'Stable'}
                       </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[8px] font-bold text-muted-foreground/40 uppercase">Previous</p>
                        <p className="text-[10px] line-clamp-2 opacity-50 italic">{lastReview.response_text}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] font-bold text-muted-foreground/40 uppercase">Current</p>
                        <p className="text-[10px] line-clamp-2 font-medium">{recallText}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SRS Meta */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-white border border-border rounded-2xl shadow-sm text-center">
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mb-1">Depth</p>
                  <p className="text-xs font-bold text-primary">{result.depthLabel}</p>
                </div>
                <div className="p-4 bg-white border border-border rounded-2xl shadow-sm text-center">
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mb-1">Interval</p>
                  <p className="text-xs font-bold">+{result.newSRS.interval_days}d</p>
                </div>
                <div className="p-4 bg-white border border-border rounded-2xl shadow-sm text-center">
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mb-1">Due</p>
                  <p className="text-xs font-bold">{result.nextDue}</p>
                </div>
              </div>

              {/* Retrieval Feedback */}
              <div className="p-6 bg-white border border-border rounded-2xl shadow-sm">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Retrieval Analysis</h3>
                <div 
                  dangerouslySetInnerHTML={{ __html: result.evalResult.highlightedHtml }} 
                  className="text-sm leading-relaxed text-foreground mb-6"
                />
                <div className="flex flex-wrap gap-2">
                  {result.evalResult.hitKeywords.map((kw: string) => (
                    <span key={kw} className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100">✓ {kw}</span>
                  ))}
                  {result.evalResult.missKeywords.map((kw: string) => (
                    <span key={kw} className="px-3 py-1 bg-rose-50 text-rose-500 rounded-full text-[10px] font-bold border border-rose-100">✗ {kw}</span>
                  ))}
                </div>
              </div>

              {/* Reference */}
              <div className="p-6 bg-primary/5 border border-primary/10 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10"><BookOpen size={48} /></div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3">Ground Truth</h3>
                <p className="text-sm leading-relaxed text-primary/80 font-medium italic">
                  "{currentAnchor.reference_answer}"
                </p>
              </div>

              {/* Navigation */}
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setPhase('input')}
                  className="flex items-center justify-center gap-2 px-8 h-14 rounded-2xl bg-muted/10 hover:bg-muted/20 transition-colors font-bold text-sm"
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
