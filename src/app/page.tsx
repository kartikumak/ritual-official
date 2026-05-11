"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Star, Plus, Settings as SettingsIcon, LayoutGrid } from "lucide-react";
import { useState, useEffect } from "react";
import { cn, getInitials } from "@/src/lib/utils";

export default function Home() {
  const [activeTab, setActiveTab] = useState("decks");
  const [profile, setProfile] = useState<{name: string, weekly_goal: number} | null>(null);
  const [showNewDeckModal, setShowNewDeckModal] = useState(false);
  const [keysMissing, setKeysMissing] = useState(false);

  useEffect(() => {
    setProfile({ name: "Maximus", weekly_goal: 140 });
    
    // Check for keys
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setKeysMissing(true);
    }
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case "decks":
        return (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold">My Decks</h2>
              <button 
                onClick={() => setShowNewDeckModal(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary/80 bg-primary/5 px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors"
              >
                <Plus size={14} />
                <span>New Deck</span>
              </button>
            </div>

            <div className="space-y-4">
              {[
                { id: '1', name: "E-commerce Landing Page", desc: "UI patterns & conversion concepts", count: 24, active: true },
                { id: '2', name: "Ed-Tech Market Analysis", desc: "Research methods & key stats", count: 18, active: false },
              ].map((deck, i) => (
                <motion.div 
                  key={deck.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    "p-5 rounded-2xl border border-border shadow-sm transition-all cursor-pointer group",
                    deck.active ? "bg-primary border-primary" : "bg-card hover:bg-muted/5"
                  )}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className={cn("text-base font-bold", deck.active ? "text-white" : "text-foreground")}>
                        {deck.name}
                      </h3>
                      <p className={cn("text-xs mt-1", deck.active ? "text-white/70" : "text-muted-foreground")}>
                        {deck.desc}
                      </p>
                    </div>
                    <div className={cn("p-2 rounded-xl", deck.active ? "bg-white/20" : "bg-muted/30")}>
                      <BookOpen size={18} className={deck.active ? "text-white" : "text-primary"} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className={cn("px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5", deck.active ? "bg-white/20 text-white" : "bg-primary/10 text-primary")}>
                      <LayoutGrid size={10} />
                      {deck.count} anchors
                    </div>
                    <Link href={`/study?deckId=${deck.id}`}>
                      <button className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-bold shadow-md transition-transform active:scale-95",
                        deck.active ? "bg-white text-primary" : "bg-primary text-white"
                      )}>
                        Study
                      </button>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        );
      case "study":
        return (
          <div className="flex flex-col items-center justify-center text-center py-12">
            <Star size={48} className="text-primary/20 mb-4" />
            <h3 className="font-bold mb-2">Ready for a Session?</h3>
            <p className="text-xs text-muted-foreground mb-6">Select a deck below to start retrieval.</p>
            <button onClick={() => setActiveTab('decks')} className="bg-primary text-white px-6 py-2 rounded-full text-xs font-bold">
              View My Decks
            </button>
          </div>
        );
      case "settings":
        return (
          <div className="space-y-4">
             <div className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold">Daily Reminders</p>
                  <p className="text-[10px] text-muted-foreground">Notify me at 9:00 AM</p>
                </div>
                <div className="w-10 h-5 bg-primary rounded-full relative">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                </div>
             </div>
             <div className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold">Dark Mode</p>
                  <p className="text-[10px] text-muted-foreground">Sync with system</p>
                </div>
                <div className="w-10 h-5 bg-muted/20 rounded-full relative">
                  <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full" />
                </div>
             </div>
          </div>
        )
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-1">
            Welcome back
          </p>
          <h1 className="text-2xl font-serif font-bold text-foreground">
            {profile?.name || "Explorer"}
          </h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
          {profile ? getInitials(profile.name) : "U"}
        </div>
      </header>

      <div className="px-6 flex-1">
        {keysMissing && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-800 leading-relaxed">
            <span className="font-bold block mb-1">⚠️ Supabase Keys Missing</span>
            Please add <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to your environment secrets to enable persistent storage and real authentication.
          </div>
        )}
        {activeTab === "decks" && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-card border border-border shadow-sm"
              >
                <p className="text-[11px] text-muted-foreground font-medium mb-1">Reviews Done</p>
                <p className="text-3xl font-bold text-primary">142</p>
                <p className="text-[10px] text-muted-foreground mt-1">anchors anchored</p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-4 rounded-2xl bg-card border border-border shadow-sm"
              >
                <p className="text-[11px] text-muted-foreground font-medium mb-1">Active Decks</p>
                <p className="text-3xl font-bold">3</p>
                <p className="text-[10px] text-muted-foreground mt-1">topics tracked</p>
              </motion.div>
            </div>

            {/* Weekly Goal Progress */}
            <section className="mb-8">
              <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-5">
                <div className="relative w-16 h-16 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/10" />
                    <motion.circle 
                      cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="10" 
                      strokeDasharray="251.2"
                      initial={{ strokeDashoffset: 251.2 }}
                      animate={{ strokeDashoffset: 251.2 * (1 - 0.65) }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="text-primary"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[13px] font-bold">65%</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">Weekly Goal</h3>
                  <p className="text-xs text-muted-foreground">91 / {profile?.weekly_goal || 140} anchors reviewed this week</p>
                </div>
              </div>
            </section>
          </>
        )}

        {renderTabContent()}
      </div>

      {/* Decks Section */}
      {showNewDeckModal && (
        <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-end justify-center">
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            className="w-full max-w-md bg-card rounded-t-[2.5rem] p-8 shadow-2xl border-t border-border"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">New Deck</h2>
              <button 
                onClick={() => setShowNewDeckModal(false)}
                className="w-8 h-8 rounded-full bg-muted/10 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 mb-1 block">Deck Name</label>
                <input className="w-full h-12 bg-muted/5 border border-border rounded-xl px-4 text-sm focus:border-primary outline-none" placeholder="e.g. JavaScript Frameworks" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 mb-1 block">Description</label>
                <textarea className="w-full h-24 bg-muted/5 border border-border rounded-xl p-4 text-sm focus:border-primary outline-none resize-none" placeholder="What will you learn here?" />
              </div>
            </div>

            <button className="w-full h-14 bg-primary text-white font-bold rounded-2xl shadow-lg ring-offset-2 active:scale-95 transition-all">
              Create Deck
            </button>
          </motion.div>
        </div>
      )}

      {/* Add Anchor Modal */}
      {activeTab === 'create' && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end justify-center">
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            className="w-full max-w-md bg-card rounded-t-[2.5rem] p-8 shadow-2xl border-t border-border"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Add Anchor</h2>
              <button 
                onClick={() => setActiveTab('decks')}
                className="w-8 h-8 rounded-full bg-muted/10 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 mb-1 block">Anchor Word</label>
                <input className="w-full h-12 bg-muted/5 border border-border rounded-xl px-4 text-sm focus:border-primary outline-none" placeholder="e.g. Social Proof" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 mb-1 block">Level</label>
                    <select className="w-full h-12 bg-muted/5 border border-border rounded-xl px-3 text-sm focus:border-primary outline-none appearance-none">
                      <option>Basic</option>
                      <option>Intermediate</option>
                      <option>Advanced</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 mb-1 block">Hint</label>
                    <input className="w-full h-12 bg-muted/5 border border-border rounded-xl px-4 text-sm focus:border-primary outline-none" placeholder="Context..." />
                 </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 mb-1 block">Keywords (comma-separated)</label>
                <input className="w-full h-12 bg-muted/5 border border-border rounded-xl px-4 text-sm focus:border-primary outline-none" placeholder="trust, reviews, users" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 mb-1 block">Reference Truth</label>
                <textarea className="w-full h-24 bg-muted/5 border border-border rounded-xl p-4 text-sm focus:border-primary outline-none resize-none" placeholder="The formal explanation..." />
              </div>
            </div>

            <button className="w-full h-14 bg-primary text-white font-bold rounded-2xl shadow-lg ring-offset-2 active:scale-95 transition-all">
              Save Anchor
            </button>
          </motion.div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card/80 backdrop-blur-xl border-t border-border px-6 py-4 flex items-center justify-between z-50">
        {[
          { id: 'decks', icon: LayoutGrid, label: 'Decks' },
          { id: 'study', icon: Star, label: 'Study' },
          { id: 'create', icon: Plus, label: 'Create' },
          { id: 'settings', icon: SettingsIcon, label: 'Settings' },
        ].map((item) => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 w-12 transition-colors",
              activeTab === item.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
