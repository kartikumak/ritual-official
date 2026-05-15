'use client';

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, use } from "react";
import { ChevronLeft, Check, Sparkles } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { useAuth } from "@/src/context/AuthContext";
import { getSupabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExpressiveWorkspace } from "@/src/components/ExpressiveWorkspace";

export default function StudySession({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = use(params);
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [anchors, setAnchors] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'input' | 'result' | 'complete'>('input');
  
  // Unified expressive workspace state
  const [recallText, setRecallText] = useState("");
  const [drawingData, setDrawingData] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [session, setSession] = useState<any>(null);

  const supabase = getSupabase();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch Deck using React Query
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

      // Sort by depth
      const sorted = due.sort((a,b) => (a.anchor_progress?.[0]?.concept_depth || 0) - (b.anchor_progress?.[0]?.concept_depth || 0));

      if (sorted.length === 0) {
        setPhase('complete');
      } else {
        setAnchors(sorted);
        if (user) {
          const { data: sess, error: sErr } = await supabase.from('sessions').insert({ user_id: user.id, deck_id: deckId }).select().single();
          if (sErr) console.error("Session creation error:", sErr);
          setSession(sess);
        }
      }
    } catch (err: any) {
      console.error("Session start error:", err);
      toast.error('Failed to start session.');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const current = anchors[index];
    
    try {
      const payloadString = JSON.stringify({
        user_id: user?.id,
        anchor_id: current.id,
        text: recallText,
        session_id: session?.id,
        drawing_json: drawingData,
        audio_url: audioUrl
      });
      
      if (payloadString.length > 5 * 1024 * 1024) {
         toast.error("Input too large. Try a shorter drawing or less text.");
         return;
      }

      const resp = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadString
      });
      
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
      setDrawingData(null);
      setAudioUrl(null);
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
  const hasContent = recallText.trim().length > 0 || drawingData || audioUrl;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground overflow-hidden fixed inset-0">
      <div className="absolute top-0 inset-x-0 h-[400px] bg-gradient-to-b from-primary/10 via-background to-background pointer-events-none -z-10" />

      <header className="max-w-3xl mx-auto w-full px-4 pt-6 pb-2 flex flex-col gap-4 relative z-10 transition-all bg-background">
        <div className="flex items-center justify-between w-full">
          <button onClick={() => router.push('/')} className="w-12 h-12 shrink-0 rounded-full bg-foreground flex items-center justify-center text-background hover:scale-105 transition-transform active:scale-95 shadow-md">
             <ChevronLeft size={24} className="-ml-0.5" />
          </button>
          
          {/* Brutalist Progress Bar */}
          <div className="flex-1 mx-6 h-4 border-2 border-foreground p-0.5 relative">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${((index) / (anchors.length || 1)) * 100}%` }}
              className="h-full bg-foreground transition-all duration-700 ease-out"
            />
          </div>

          {/* Forward / Next button replacing bottom button */}
          {phase === 'input' ? (
            <button 
              onClick={handleEvaluate}
              disabled={!hasContent || isSubmitting}
              className="w-12 h-12 shrink-0 rounded-full bg-foreground flex items-center justify-center text-background hover:scale-105 transition-transform active:scale-95 shadow-md disabled:opacity-40"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <ChevronLeft size={24} className="rotate-180 ml-0.5" />
              )}
            </button>
          ) : (
            <button 
              onClick={nextAnchor}
              className="w-12 h-12 shrink-0 rounded-full bg-foreground flex items-center justify-center text-background hover:scale-105 transition-transform active:scale-95 shadow-md"
            >
              <ChevronLeft size={24} className="rotate-180 ml-0.5" />
            </button>
          )}
        </div>

        <div className="flex justify-start pt-2">
          <div className="bg-foreground text-background px-6 py-2 rounded-2xl text-2xl md:text-3xl font-bold header inline-block border border-transparent shadow-sm">
            {currentAnchor?.word || 'Anchor'}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto w-full px-4 flex-1 flex flex-col pb-4 relative z-10 min-h-0 overflow-y-auto mb-2">
        <AnimatePresence mode="wait">
          {phase === 'input' ? (
             <motion.div key="input" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="flex-1 flex flex-col min-h-0">
              
              <ExpressiveWorkspace 
                text={recallText}
                setText={setRecallText}
                drawingData={drawingData}
                setDrawingData={setDrawingData}
                audioUrl={audioUrl}
                setAudioUrl={setAudioUrl}
                onContentChange={() => {}}
                isSubmitting={isSubmitting}
              />
            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col min-h-0 relative h-full">
              
              <div className="flex-1 overflow-y-auto space-y-5 pb-32 no-scrollbar px-1">
                <div className={cn(
                  "rounded-[2.5rem] p-8 text-center shadow-lg border border-white/20 relative overflow-hidden",
                  result?.evalResult?.level === 'strong' ? "bg-accent-green text-black" : 
                  result?.evalResult?.level === 'medium' ? "bg-accent-yellow text-black" : 
                  "bg-accent-pink text-white"
                )}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/30 rounded-full blur-[40px]" />
                  <span className="text-6xl block mb-4 relative z-10">{result?.evalResult?.emoji}</span>
                  <h3 className="text-2xl font-bold leading-tight relative z-10">{result?.evalResult?.label}</h3>
                  <p className="text-sm opacity-80 mt-2 font-medium relative z-10">{result?.evalResult?.correction}</p>
                </div>

                <div className="bg-white/40 dark:bg-black/20 backdrop-blur-md rounded-[2.5rem] p-6 shadow-xl border border-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-4">Your Synthesis</p>
                  <div 
                    className="bg-background/40 rounded-2xl p-5 text-sm leading-relaxed mb-5 highlighted-answer font-medium border border-white/5"
                    dangerouslySetInnerHTML={{ __html: result?.evalResult?.highlightedHtml || "" }} 
                  />
                  <div className="flex flex-wrap gap-2">
                    {result?.evalResult?.hitKeywords?.map((kw: string) => (
                      <span key={kw} className="bg-accent-green/20 text-accent-green px-3 py-1.5 rounded-xl text-xs font-bold ring-1 ring-accent-green/30">✓ {kw}</span>
                    ))}
                    {result?.evalResult?.missKeywords?.map((kw: string) => (
                      <span key={kw} className="bg-accent-pink/20 text-accent-pink px-3 py-1.5 rounded-xl text-xs font-bold ring-1 ring-accent-pink/30">✗ {kw}</span>
                    ))}
                  </div>
                </div>

                <div className="bg-white/40 dark:bg-black/20 backdrop-blur-md rounded-[2.5rem] p-6 shadow-xl border border-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Core Definition</p>
                  <p className="text-lg font-medium leading-relaxed">{currentAnchor?.reference_answer}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white/30 dark:bg-black/20 backdrop-blur-md rounded-[2rem] p-4 text-center border border-white/10">
                      <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Interval</p>
                      <p className="text-xl font-bold text-primary">+{result?.newSRS?.interval_days}d</p>
                   </div>
                   <div className="bg-white/30 dark:bg-black/20 backdrop-blur-md rounded-[2rem] p-4 text-center border border-white/10">
                      <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Next Due</p>
                      <p className="text-xl font-bold text-foreground">
                        {result ? new Date(result.nextDue || result.newSRS.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ""}
                      </p>
                   </div>
                </div>
              </div>

              {/* Removed Floating Next Button */}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
