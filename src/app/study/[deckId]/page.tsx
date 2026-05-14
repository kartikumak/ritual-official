'use client';

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, use } from "react";
import { ChevronLeft, Check, Quote, BookOpen, Image as ImageIcon, Mic } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { useAuth } from "@/src/context/AuthContext";
import { getSupabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import DrawingPad from "@/src/components/DrawingPad";
import VoiceRecorder from "@/src/components/VoiceRecorder";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  
  // Modals
  const [showDrawingPad, setShowDrawingPad] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);

  const supabase = getSupabase();
  const router = useRouter();
  const queryClient = useQueryClient();

  // 1. Fetch Deck using React Query
  const { data: deck } = useQuery({
    queryKey: ['deck', deckId],
    queryFn: async () => {
      const { data, error } = await supabase.from('decks').select('*').eq('id', deckId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!deckId && !!user,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && deck) {
      startSession();
    }
  }, [user, authLoading, deck]);

  const startSession = async () => {
    setLoading(true);
    try {
      const { data: anchorsData } = await supabase
        .from('anchors')
        .select('*, anchor_progress(*)')
        .eq('deck_id', deckId);

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
        // Create session
        if (user) {
          const { data: sess, error: sErr } = await supabase.from('sessions').insert({ user_id: user.id, deck_id: deckId }).select().single();
          if (sErr) console.error("Session creation error:", sErr);
          setSession(sess);
        }
      }
    } catch (err: any) {
      console.error("Session start error:", err);
      toast.error('Failed to start session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const current = anchors[index];
    
    try {
      // Very basic payload size checking.
      const payloadString = JSON.stringify({
        user_id: user?.id,
        anchor_id: current.id,
        text: recallText,
        session_id: session?.id,
        drawing_json: currentDrawing,
        audio_url: currentAudio
      });
      
      if (payloadString.length > 5 * 1024 * 1024) {
         toast.error("Payload too large. Please reduce drawing size or text.");
         return;
      }

      const resp = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadString
      });
      
      // Handle rate limits or payload errors
      if (resp.status === 429) {
         toast.error("You are studying too fast! Please wait a moment.");
         return;
      }
      if (resp.status === 413) {
         toast.error("Input is too large.");
         return;
      }

      const data = await resp.json();
      if (data.error) throw new Error(data.error);

      setResult(data);
      setPhase('result');
      
      // Clear current workspace items
      setCurrentDrawing(null);
      setCurrentAudio(null);
    } catch (err: any) {
      console.error("Evaluation error:", err);
      toast.error(err.message || 'Verification failed. Try again.');
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
       await supabase.from('sessions').update({ ended_at: new Date().toISOString() }).eq('id', session.id);
    }
    queryClient.invalidateQueries({ queryKey: ['stats', user?.id] });
    setPhase('complete');
  };

  if (loading || authLoading || !deck) return (
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

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground overflow-x-hidden relative">
      {/* Background ambient glow */}
      <div className="absolute top-0 inset-x-0 h-[400px] bg-gradient-to-b from-primary/10 to-transparent blur-[80px] pointer-events-none -z-10" />

      {/* Session Top Bar */}
      <header className="max-w-2xl mx-auto w-full px-6 pt-12 pb-8 flex items-center justify-between relative z-10">
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-muted mb-2">Study Session</p>
          <div className="text-xl font-medium text-foreground leading-none flex items-baseline gap-1">
            <span>{index + 1}</span>
            <span className="text-sm text-muted">/ {anchors.length}</span>
          </div>
        </div>
        <button onClick={() => router.push('/')} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted hover:text-foreground transition-colors shadow-sm">
           <ChevronLeft size={20} className="-ml-0.5" />
        </button>
      </header>

      <main className="max-w-2xl mx-auto w-full px-6 flex-1 flex flex-col pb-24 relative z-10">
        <AnimatePresence mode="wait">
          {phase === 'input' ? (
            <motion.div key="input" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="flex-1 flex flex-col">
              {/* Progress Bar */}
              <div className="mb-8">
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(index / (anchors.length || 1)) * 100}%` }}
                    className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                  />
                </div>
              </div>

              {/* Anchor Card / Concept Title */}
              <div className="text-center mb-8">
                <h2 className="text-4xl sm:text-5xl font-serif text-foreground leading-tight mb-3 drop-shadow-sm">{currentAnchor?.word}</h2>
                {currentAnchor?.hint && <p className="text-sm text-muted font-medium px-4">{currentAnchor.hint}</p>}
              </div>

              {/* Input Tabs */}
              <div className="flex gap-2 mb-6">
                <button 
                  onClick={() => { setShowDrawingPad(false); setShowVoiceRecorder(false); }}
                  className={cn(
                    "flex-1 py-3 rounded-[1.5rem] text-xs font-bold flex items-center justify-center gap-2 transition-all",
                    !showDrawingPad && !showVoiceRecorder ? "bg-foreground text-background shadow-lg" : "bg-card text-muted shadow-sm hover:text-foreground"
                  )}
                >
                  <Quote size={16} /> Type
                </button>
                <button 
                  onClick={() => { setShowDrawingPad(true); setShowVoiceRecorder(false); }}
                  className={cn(
                    "flex-1 py-3 rounded-[1.5rem] text-xs font-bold flex items-center justify-center gap-2 transition-all",
                    showDrawingPad ? "bg-foreground text-background shadow-lg" : "bg-card text-muted shadow-sm hover:text-foreground"
                  )}
                >
                  <ImageIcon size={16} /> Draw
                </button>
                <button 
                  onClick={() => { setShowVoiceRecorder(true); setShowDrawingPad(false); }}
                  className={cn(
                    "flex-1 py-3 rounded-[1.5rem] text-xs font-bold flex items-center justify-center gap-2 transition-all",
                    showVoiceRecorder ? "bg-foreground text-background shadow-lg" : "bg-card text-muted shadow-sm hover:text-foreground"
                  )}
                >
                  <Mic size={16} /> Speak
                </button>
              </div>

              {/* Recall Workspace */}
              <div className="flex-1 flex flex-col gap-4">
                {showDrawingPad ? (
                   <div className="flex flex-col gap-4">
                     <div className="bg-card rounded-[2rem] border border-white/20 shadow-md overflow-hidden h-[300px] relative w-full">
                       <DrawingPad onSave={(data) => { setCurrentDrawing(data); setShowDrawingPad(false); toast.success("Drawing attached"); }} onClose={() => setShowDrawingPad(false)} />
                     </div>
                     <textarea 
                        value={recallText}
                        onChange={(e) => setRecallText(e.target.value)}
                        placeholder="(Optional) Add context to your drawing..."
                        className="w-full bg-card shadow-sm border border-transparent focus:border-primary/30 rounded-[1.5rem] px-5 py-4 text-sm font-medium outline-none transition-all min-h-[80px] resize-none"
                      />
                   </div>
                ) : showVoiceRecorder ? (
                   <div className="flex flex-col gap-4">
                    <div className="bg-card rounded-[2rem] border border-white/20 shadow-md p-6 flex flex-col items-center justify-center w-full min-h-[200px]">
                      <VoiceRecorder 
                        onSave={(url) => { setCurrentAudio(url); setShowVoiceRecorder(false); toast.success("Audio attached"); }} 
                        onClose={() => setShowVoiceRecorder(false)} 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative flex-1 min-h-[220px]">
                     <textarea 
                       value={recallText}
                       onChange={(e) => setRecallText(e.target.value)}
                       placeholder="Express your understanding..."
                       className="absolute inset-0 w-full h-full bg-card shadow-sm border border-transparent focus:border-primary/30 rounded-[2rem] p-6 text-base leading-relaxed outline-none transition-all resize-none font-medium placeholder:text-muted/60"
                       autoFocus
                     />
                  </div>
                )}

                <div className="flex flex-col gap-3 mt-4">
                   {(currentDrawing || currentAudio) && (
                      <div className="flex gap-2">
                        {currentDrawing && <div className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">Drawing Attached</div>}
                        {currentAudio && <div className="px-3 py-1 bg-accent-cyan/10 text-accent-cyan text-xs font-bold rounded-full">Audio Attached</div>}
                      </div>
                   )}
                   <button 
                    onClick={handleEvaluate}
                    disabled={(!recallText && !currentDrawing && !currentAudio) || isSubmitting}
                    className="w-full bg-primary text-primary-foreground py-4 rounded-[1.5rem] font-bold tracking-wide shadow-glow-purple disabled:opacity-40 transition-transform active:scale-[0.98] flex items-center justify-center"
                   >
                    {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Verify Understanding"}
                   </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 pb-12">
              {/* Result Head */}
              <div className={cn(
                "rounded-[2rem] p-8 text-center shadow-lg border border-white/20 relative overflow-hidden",
                result?.evalResult?.level === 'strong' ? "bg-accent-green" : 
                result?.evalResult?.level === 'medium' ? "bg-accent-yellow" : 
                "bg-accent-pink"
              )}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-[40px]" />
                <span className="text-5xl block mb-4 relative z-10">{result?.evalResult?.emoji}</span>
                <h3 className="text-xl font-bold text-background leading-tight relative z-10">{result?.evalResult?.label}</h3>
                <p className="text-sm text-background/80 mt-2 font-medium relative z-10">{result?.evalResult?.correction}</p>
              </div>

              {/* Your Answer */}
              <div className="bg-card rounded-[1.5rem] p-6 shadow-sm border border-white/10">
                <p className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Your Synthesis</p>
                <div 
                  className="bg-secondary/50 rounded-xl p-4 text-sm leading-relaxed mb-4 highlighted-answer font-medium"
                  dangerouslySetInnerHTML={{ __html: result?.evalResult?.highlightedHtml || "" }} 
                />
                <div className="flex flex-wrap gap-2">
                  {result?.evalResult?.hitKeywords?.map((kw: string) => (
                    <span key={kw} className="bg-accent-green/10 text-accent-green px-3 py-1.5 rounded-full text-xs font-bold">✓ {kw}</span>
                  ))}
                  {result?.evalResult?.missKeywords?.map((kw: string) => (
                    <span key={kw} className="bg-accent-pink/10 text-accent-pink px-3 py-1.5 rounded-full text-xs font-bold">✗ {kw}</span>
                  ))}
                </div>
              </div>

              {/* Reference */}
              <div className="bg-card rounded-[1.5rem] p-6 shadow-sm border border-white/10">
                <p className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Core Definition</p>
                <p className="text-sm font-medium leading-relaxed">{currentAnchor?.reference_answer}</p>
              </div>

              {/* Stats */}
              <div className="flex gap-4">
                 <div className="flex-1 bg-secondary rounded-[1.5rem] p-5 text-center">
                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Interval</p>
                    <p className="text-lg font-bold text-primary">+{result?.newSRS?.interval_days}d</p>
                 </div>
                 <div className="flex-1 bg-secondary rounded-[1.5rem] p-5 text-center">
                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Next Due</p>
                    <p className="text-lg font-bold text-foreground">
                      {result ? new Date(result.nextDue || result.newSRS.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ""}
                    </p>
                 </div>
              </div>

              {/* Next Action */}
              <button 
                onClick={nextAnchor}
                className="w-full bg-foreground text-background py-5 rounded-[1.5rem] font-bold shadow-xl flex items-center justify-center gap-2 mt-4 active:scale-[0.98] transition-transform"
              >
                Continue Concept <ChevronLeft size={18} className="rotate-180" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
