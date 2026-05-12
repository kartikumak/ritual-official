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
    <div className="flex flex-col min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Session Top Bar */}
      <header className="max-w-[420px] mx-auto w-full px-5 pt-12 pb-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-medium tracking-[0.13em] uppercase text-muted mb-1">Study Session</p>
          <div className="text-[20px] font-semibold text-foreground leading-none">{index + 1} <span className="text-[14px] text-muted font-medium">/ {anchors.length}</span></div>
        </div>
        <span className="text-[12px] text-muted font-medium bg-secondary px-3 py-1.5 rounded-full">{deck?.name}</span>
      </header>

      <main className="max-w-[420px] mx-auto w-full px-5 flex-1 flex flex-col pb-20">
        <AnimatePresence mode="wait">
          {phase === 'input' ? (
            <motion.div key="input" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 flex flex-col">
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(index / anchors.length) * 100}%` }}
                    className="h-full bg-primary rounded-full transition-all duration-500"
                  />
                </div>
                <div className="flex justify-between mt-1.5 px-0.5">
                  <span className="text-[11px] text-muted">{index} done</span>
                  <span className="text-[11px] text-muted">review session</span>
                </div>
              </div>

              {/* Anchor Card */}
              <div className="anchor-card relative animate-in fade-in zoom-in duration-500">
                <div className="relative z-10">
                  <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/60 mb-2">Anchor · {currentAnchor.level}</p>
                  <h2 className="text-[32px] font-serif text-white leading-tight mb-2">{currentAnchor.word}</h2>
                  {currentAnchor.hint && <p className="text-[11px] text-white/60 italic">{currentAnchor.hint}</p>}
                </div>
              </div>

              {/* Input Tabs (Optional, but let's keep clean) */}
              <div className="flex gap-1.5 mb-4">
                <button 
                  onClick={() => setShowDrawingPad(false)}
                  className={cn(
                    "flex-1 py-2 rounded-lg border-[1.5px] text-[12px] font-medium flex items-center justify-center gap-2 transition-all",
                    !showDrawingPad ? "bg-primary-light text-primary border-transparent" : "bg-card text-muted border-border"
                  )}
                >
                  <Quote size={14} /> Write
                </button>
                <button 
                  onClick={() => setShowDrawingPad(true)}
                  className={cn(
                    "flex-1 py-2 rounded-lg border-[1.5px] text-[12px] font-medium flex items-center justify-center gap-2 transition-all",
                    showDrawingPad ? "bg-primary-light text-primary border-transparent" : "bg-card text-muted border-border"
                  )}
                >
                  <ImageIcon size={14} /> Draw
                </button>
              </div>

              {/* Recall Workspace */}
              <div className="flex-1 flex flex-col gap-4">
                {showDrawingPad ? (
                   <div className="flex flex-col gap-3">
                     <div className="bg-white rounded-lg border-[1.5px] border-border overflow-hidden h-[220px]">
                       <DrawingPad onSave={(data) => { setCurrentDrawing(data); setShowDrawingPad(false); }} onClose={() => setShowDrawingPad(false)} />
                     </div>
                     <textarea 
                        value={recallText}
                        onChange={(e) => setRecallText(e.target.value)}
                        placeholder="(Optional) Add a text note to go with your drawing…"
                        className="field min-h-[80px] resize-none"
                      />
                   </div>
                ) : (
                  <textarea 
                    value={recallText}
                    onChange={(e) => setRecallText(e.target.value)}
                    placeholder="Write everything you know about this anchor… Concepts, connections, examples — all of it. Don't worry about being perfect."
                    className="field flex-1 min-h-[160px] resize-none leading-relaxed"
                    autoFocus
                  />
                )}

                <div className="flex gap-2">
                   <button 
                    onClick={handleEvaluate}
                    disabled={(!recallText && !currentDrawing) || isSubmitting}
                    className="btn-primary flex-1 py-4 text-[13px] font-bold uppercase tracking-widest disabled:opacity-40"
                  >
                    {isSubmitting ? "Evaluating..." : "Evaluate recall"}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pb-10">
              {/* Result Score Card */}
              <div className={cn(
                "rounded-[--radius] p-5 animate-in slide-in-from-bottom-2 duration-500",
                result.evalResult.level === 'strong' ? "bg-gradient-to-br from-[#e2f5ec] to-[#d4f0e3] border-[1.5px] border-[#b8e8cf]" : 
                result.evalResult.level === 'medium' ? "bg-gradient-to-br from-[#fef3d8] to-[#fdedc5] border-[1.5px] border-[#f5d98b]" : 
                "bg-gradient-to-br from-[#fde8e8] to-[#fcd8d8] border-[1.5px] border-[#f5b8b8]"
              )}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[28px] leading-none">{result.evalResult.emoji}</span>
                  <div>
                    <h3 className="text-[15px] font-bold text-foreground leading-none">{result.evalResult.label}</h3>
                    <p className="text-[11px] text-muted mt-1">{result.evalResult.sublabel}</p>
                  </div>
                </div>
                <p className="text-[12px] text-muted leading-relaxed italic">
                  {result.evalResult.correction}
                </p>
              </div>

              {/* Your Answer Section */}
              <div className="card-sm">
                <p className="text-[12px] font-bold text-foreground mb-2">Your answer — keywords highlighted</p>
                <div 
                  className="bg-muted-bg/30 rounded-lg p-3 text-[13px] leading-relaxed mb-3 highlighted-answer"
                  dangerouslySetInnerHTML={{ __html: result.evalResult.highlightedHtml }} 
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {result.evalResult.hitKeywords.map((kw: string) => (
                    <span key={kw} className="bg-[#e2f5ec] text-[#2d8a5a] text-[11px] font-medium px-2.5 py-1 rounded-full">✓ {kw}</span>
                  ))}
                  {result.evalResult.missKeywords.map((kw: string) => (
                    <span key={kw} className="bg-[#fde8e8] text-[#c0504d] text-[11px] font-medium px-2.5 py-1 rounded-full italic">✗ {kw}</span>
                  ))}
                </div>
              </div>

              {/* Reference Truth */}
              <div className="card-sm">
                <p className="text-[12px] font-bold text-foreground mb-2">Reference Truth</p>
                <p className="text-[12px] text-muted leading-relaxed">
                  {currentAnchor.reference_answer}
                </p>
              </div>

              {/* Session Meta */}
              <div className="grid grid-cols-3 gap-3">
                <div className="card-sm p-3 text-center">
                  <p className="text-[10px] text-muted uppercase font-bold mb-1">Depth</p>
                  <p className="text-[12px] font-bold text-primary">{result.depthLabel}</p>
                </div>
                <div className="card-sm p-3 text-center">
                  <p className="text-[10px] text-muted uppercase font-bold mb-1">Interval</p>
                  <p className="text-[12px] font-bold text-accent">+{result.newSRS.interval_days}d</p>
                </div>
                <div className="card-sm p-3 text-center">
                   <p className="text-[10px] text-muted uppercase font-bold mb-1">Next</p>
                   <p className="text-[12px] font-bold text-foreground">
                    {new Date(result.nextDue || result.newSRS.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                   </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setPhase('input')}
                  className="btn bg-secondary text-muted px-6 text-[13px] font-medium"
                >
                  Retry
                </button>
                <button 
                  onClick={nextAnchor}
                  className="btn-primary flex-1 py-4 text-[13px] font-bold uppercase tracking-widest"
                >
                  Next Anchor →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

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
