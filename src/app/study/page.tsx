"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { ChevronLeft, Check, FastForward, RotateCcw } from "lucide-react";
import { cn } from "@/src/lib/utils";

export default function StudySession() {
  const [phase, setPhase] = useState<'input' | 'result'>('input');
  const [recallText, setRecallText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Mock data for the study experience
  const currentAnchor = {
    word: "Above the Fold",
    hint: "Landing page structure",
    level: "basic",
    depth_label: "Recognized",
    reference_answer: "The portion of a web page visible without scrolling. Critical for capturing attention and communicating value immediately.",
    keywords: ["scroll", "visible", "attention", "conversion", "hero"]
  };

  const handleEvaluate = async () => {
    setIsSubmitting(true);
    // Simulate API call to /api/recall/evaluate
    setTimeout(() => {
      setResult({
        score: 72,
        level: 'strong',
        emoji: '🌟',
        label: 'Strong Recall',
        sublabel: 'Score 72/100 — solid memory connection.',
        hitKeywords: ['scroll', 'visible', 'attention'],
        missKeywords: ['conversion', 'hero'],
        correction: "✦ Nearly complete. Missed concepts: \"conversion\", \"hero\".\n✦ Response depth is strong — clear conceptual understanding.",
        nextDue: "5/18/2026",
        interval: "7d",
        depthLabel: "Recalled",
        highlightedHtml: "The portion of a web page <span class='font-semibold text-emerald-600 bg-emerald-50 px-1 rounded'>visible</span> without <span class='font-semibold text-emerald-600 bg-emerald-50 px-1 rounded'>scroll</span>. Critical for capturing <span class='font-semibold text-emerald-600 bg-emerald-50 px-1 rounded'>attention</span>..."
      });
      setIsSubmitting(false);
      setPhase('result');
    }, 1200);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Session Top Bar */}
      <div className="px-6 pt-12 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center hover:bg-muted/30 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Study Session</p>
            <p className="text-xl font-bold">1 / 12</p>
          </div>
        </div>
        <div className="text-[11px] font-bold py-1 px-3 bg-muted/10 rounded-full">
          E-commerce Design
        </div>
      </div>

      {/* Progress Track */}
      <div className="px-6 mb-6">
        <div className="h-1.5 w-full bg-muted/10 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "8.33%" }}
            className="h-full bg-primary"
          />
        </div>
      </div>

      <div className="px-6 flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {phase === 'input' ? (
            <motion.div 
              key="input"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col"
            >
              {/* Anchor Card */}
              <div className="relative p-8 rounded-[2rem] bg-primary text-white shadow-xl mb-6 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] uppercase font-heavy tracking-[0.15em] opacity-70">Anchor · {currentAnchor.level}</span>
                    <span className="w-1 h-1 rounded-full bg-white/30" />
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-bold uppercase">{currentAnchor.depth_label}</span>
                  </div>
                  <h2 className="text-4xl font-serif font-bold mb-2">{currentAnchor.word}</h2>
                  <p className="text-white/60 text-xs italic">{currentAnchor.hint}</p>
                </div>
              </div>

              {/* Recall Input */}
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-[2px] bg-primary/20" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Recall Action</span>
                  <div className="flex-1 h-[2px] bg-primary/20" />
                </div>

                <textarea 
                  value={recallText}
                  onChange={(e) => setRecallText(e.target.value)}
                  placeholder="Write everything you know about this anchor concept. Don't worry about being perfect — just retrieve it."
                  className="flex-1 w-full p-5 rounded-2xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none text-sm leading-relaxed"
                />

                <button 
                  onClick={handleEvaluate}
                  disabled={!recallText || isSubmitting}
                  className="w-full h-14 bg-primary text-white font-bold rounded-2xl shadow-lg ring-offset-2 active:scale-95 transition-all hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check size={18} strokeWidth={3} />
                      Evaluate Recall
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 pb-12"
            >
              {/* Result Header */}
              <div className={cn(
                "p-6 rounded-3xl border shadow-sm relative overflow-hidden",
                result.level === 'strong' ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"
              )}>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-4xl">{result.emoji}</span>
                  <div>
                    <h2 className="text-xl font-bold">{result.label}</h2>
                    <p className="text-xs text-muted-foreground">{result.sublabel}</p>
                  </div>
                </div>
                <pre className="text-xs font-sans text-muted-foreground leading-relaxed whitespace-pre-wrap italic">
                  {result.correction}
                </pre>
              </div>

              {/* SRS Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-muted/5 border border-border rounded-2xl text-center">
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mb-1">Depth</p>
                  <p className="text-xs font-bold">{result.depthLabel}</p>
                </div>
                <div className="p-3 bg-muted/5 border border-border rounded-2xl text-center">
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mb-1">Next Review</p>
                  <p className="text-xs font-bold">{result.nextDue}</p>
                </div>
                <div className="p-3 bg-muted/5 border border-border rounded-2xl text-center">
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mb-1">Interval</p>
                  <p className="text-xs font-bold">+{result.interval}</p>
                </div>
              </div>

              {/* Your Answer */}
              <div className="p-5 bg-card border border-border rounded-2xl">
                <h3 className="text-[10px] font-bold uppercase text-muted-foreground mb-3">Your Retrieval</h3>
                <div 
                  dangerouslySetInnerHTML={{ __html: result.highlightedHtml }} 
                  className="text-sm leading-relaxed text-foreground mb-4"
                />
                <div className="flex flex-wrap gap-2">
                  {result.hitKeywords.map((kw: string) => (
                    <span key={kw} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">✓ {kw}</span>
                  ))}
                  {result.missKeywords.map((kw: string) => (
                    <span key={kw} className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-[10px] font-bold">✗ {kw}</span>
                  ))}
                </div>
              </div>

              {/* Reference Answer */}
              <div className="p-5 bg-primary/5 border border-primary/10 rounded-2xl bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 to-transparent">
                <h3 className="text-[10px] font-bold uppercase text-primary mb-2">Reference Truth</h3>
                <p className="text-sm leading-relaxed text-primary/80">
                  {currentAnchor.reference_answer}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button 
                  onClick={() => setPhase('input')}
                  className="flex items-center justify-center gap-2 px-6 h-12 rounded-2xl bg-muted/10 hover:bg-muted/20 transition-colors font-bold text-sm"
                >
                  <RotateCcw size={16} />
                  Retry
                </button>
                <button 
                  className="flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl bg-primary text-white font-bold text-sm shadow-md transition-transform active:scale-95"
                >
                  Next Anchor
                  <FastForward size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
