'use client';

import { motion } from "framer-motion";
import { ChevronLeft, Orbit, Target, Zap, Heart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-background pb-12">
      <header className="px-6 pt-12 pb-6 flex items-center gap-4">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center">
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-xl font-serif font-bold">About Rituals</h1>
      </header>

      <div className="px-6 space-y-12">
        <section className="text-center py-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Orbit size={32} className="text-primary" />
          </div>
          <h2 className="text-3xl font-serif font-bold mb-4 italic">Belief in Depth.</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Rituals is built on the principle that true knowledge isn't found in quick scrolls, but in deliberate recall and scientific repetition.
          </p>
        </section>

        <div className="grid gap-6">
          <div className="p-6 rounded-3xl bg-card border border-border shadow-sm">
            <Target className="text-primary mb-3" size={24} />
            <h3 className="text-sm font-bold mb-2">Our Mission</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              To empower deep learners with the tools to anchor concepts permanently into their long-term memory using evidence-based cognitive strategies.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-card border border-border shadow-sm">
            <Zap className="text-primary mb-3" size={24} />
            <h3 className="text-sm font-bold mb-2">The Memory Fade System</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              As you master a concept, Rituals gradually reduces the assistance shown to you. Previous responses fade away as your autonomy grows, ensuring your brain does the heavy lifting required for true long-term anchoring.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-card border border-border shadow-sm">
            <Heart className="text-primary mb-3" size={24} />
            <h3 className="text-sm font-bold mb-2">Made by Kartik</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Rituals is a labor of love by Kartik, designed for those who value understanding over information. A tool for the curious, the studious, and the obsessive.
            </p>
          </div>
        </div>

        <footer className="text-center pt-8 border-t border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Version 1.0.2 — Stable Release</p>
        </footer>
      </div>
    </div>
  );
}
