'use client';

import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Plus, Play, Trash2 } from "lucide-react";
import { useState, use } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAnchors } from "@/src/hooks/useAnchors";
import { toast } from "sonner";

export default function DeckDetailsPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = use(params);
  const { user, loading: authLoading } = useAuth();
  
  const { deck, anchors, isLoading, createAnchor, isCreating, deleteAnchor } = useAnchors(deckId);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAnchor, setNewAnchor] = useState({ word: '', hint: '', reference_answer: '' });

  const router = useRouter();

  const handleCreateAnchor = () => {
    if (!newAnchor.word || !newAnchor.reference_answer) {
      toast.error("Please provide both a concept and a reference answer.");
      return;
    }
    
    createAnchor(newAnchor, {
      onSuccess: () => {
        setShowAddModal(false);
        setNewAnchor({ word: '', hint: '', reference_answer: '' });
      }
    });
  };

  const handleDeleteAnchor = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast('Delete this concept?', {
      action: {
        label: 'Confirm',
        onClick: () => deleteAnchor(id),
      },
      cancel: { label: 'Cancel', onClick: () => {} }
    });
  };

  if (isLoading || authLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden pb-32 relative">
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-primary/10 to-transparent blur-[80px] pointer-events-none -z-10" />

      {/* Top Bar */}
      <header className="flex items-center justify-between p-6 relative z-10 w-full max-w-2xl mx-auto">
        <Link href="/" className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted hover:text-foreground transition-colors shadow-sm">
           <ChevronLeft size={20} className="-ml-0.5" />
        </Link>
        <button onClick={() => setShowAddModal(true)} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-glow-purple hover:scale-105 transition-transform">
           <Plus size={20} />
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-6 w-full relative z-10 mt-4">
        {/* Deck Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="text-4xl font-serif font-bold text-foreground mb-3">{deck?.name}</h1>
          <p className="text-sm text-muted max-w-sm mx-auto">{deck?.description}</p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href={`/study/${deck?.id}`} className="bg-foreground text-background px-8 py-4 rounded-full font-bold text-sm tracking-wide inline-flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 shadow-xl">
               <Play size={18} className="fill-current" /> Study Now
            </Link>
          </div>
        </motion.div>

        {/* Anchors List */}
        <div className="space-y-4">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-lg font-bold">Concepts</h2>
            <span className="text-xs font-bold text-muted uppercase tracking-widest">{anchors.length} total</span>
          </div>

          <AnimatePresence>
            {anchors.map((anchor: any) => (
              <motion.div 
                key={anchor.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card rounded-[2rem] p-6 shadow-sm border border-border/50 group flex flex-col gap-2"
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-serif font-bold">{anchor.word}</h3>
                  <button onClick={(e) => handleDeleteAnchor(anchor.id, e)} className="text-muted/40 hover:text-accent-pink transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
                {anchor.hint && <p className="text-xs text-muted font-medium italic">{anchor.hint}</p>}
                <p className="text-sm text-muted mt-2 line-clamp-2">{anchor.reference_answer}</p>
              </motion.div>
            ))}
          </AnimatePresence>
          {anchors.length === 0 && (
            <div className="bg-secondary/50 rounded-[2rem] p-10 text-center border border-dashed border-border">
              <p className="text-foreground font-bold">No concepts yet</p>
              <p className="text-sm text-muted mt-2">Add your first concept to this deck.</p>
            </div>
          )}
        </div>
      </main>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-sm bg-card rounded-[2.5rem] p-8 shadow-2xl border border-white/10">
              <h2 className="text-xl font-bold mb-6 text-foreground">New Concept</h2>
              <div className="space-y-4 mb-8">
                <input 
                  value={newAnchor.word}
                  onChange={e => setNewAnchor({...newAnchor, word: e.target.value})}
                  placeholder="Concept (e.g. Action Potential)"
                  className="w-full bg-secondary rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-transparent focus:border-primary/30"
                />
                <input 
                  value={newAnchor.hint}
                  onChange={e => setNewAnchor({...newAnchor, hint: e.target.value})}
                  placeholder="Hint (optional)"
                  className="w-full bg-secondary rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-transparent focus:border-primary/30"
                />
                <textarea 
                  value={newAnchor.reference_answer}
                  onChange={e => setNewAnchor({...newAnchor, reference_answer: e.target.value})}
                  placeholder="Core Definition (What is the truth?)"
                  className="w-full bg-secondary rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/50 transition-all min-h-[100px] resize-none border border-transparent focus:border-primary/30"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-sm font-bold text-muted hover:text-foreground rounded-2xl transition-colors">Cancel</button>
                <button onClick={handleCreateAnchor} disabled={!newAnchor.word || !newAnchor.reference_answer || isCreating} className="flex-1 py-4 text-sm font-bold bg-foreground text-background rounded-2xl shadow-lg disabled:opacity-50">
                  {isCreating ? "Saving..." : "Create"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
