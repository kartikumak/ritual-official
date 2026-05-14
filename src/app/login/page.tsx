'use client';

import { useAuth } from '@/src/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/src/lib/utils';
import Link from 'next/link';

export default function LoginPage() {
  const { signInWithEmail, signUpWithEmail, user, loading } = useAuth();
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        if (!name) throw new Error('Please tell us your name.');
        const { error } = await signUpWithEmail(email, password, name);
        if (error) throw error;
        alert('Welcome! Please check your email to confirm your account.');
      } else {
        const { error } = await signInWithEmail(email, password);
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-background relative overflow-hidden">
      {/* Soft Ambient Backgrounds */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen -z-10" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-cyan/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen -z-10" />
      
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center z-10 w-full max-w-sm">
        <h1 className="text-3xl font-serif font-normal text-foreground mb-2">Rituals</h1>
        <p className="text-muted text-sm font-medium">Concept reflection and mastery</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-sm z-10"
      >
        <div className="bg-card/80 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-8 shadow-2xl">
          <div className="flex gap-4 mb-8 bg-secondary/50 p-1.5 rounded-full">
            <button 
              onClick={() => { setIsSignUp(false); setError(null); }}
              className={cn(
                "flex-1 py-3 text-xs font-bold rounded-full transition-all",
                !isSignUp ? "bg-card shadow-sm text-foreground" : "text-muted hover:text-foreground"
              )}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setIsSignUp(true); setError(null); }}
              className={cn(
                "flex-1 py-3 text-xs font-bold rounded-full transition-all",
                isSignUp ? "bg-card shadow-sm text-foreground" : "text-muted hover:text-foreground"
              )}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {isSignUp && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-1.5">
                  <input 
                    required={isSignUp}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-secondary border border-transparent rounded-[1.5rem] px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none transition-all placeholder:text-muted" 
                    placeholder="Your Name" 
                  />
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="space-y-1.5">
              <input 
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-secondary border border-transparent rounded-[1.5rem] px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none transition-all placeholder:text-muted" 
                placeholder="Email Address" 
              />
            </div>
            
            <div className="relative">
              <input 
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-secondary border border-transparent rounded-[1.5rem] px-5 py-4 pr-12 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none transition-all placeholder:text-muted" 
                placeholder="Password" 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-muted hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-accent-pink text-[11px] font-bold px-2">
                  * {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              disabled={isSubmitting}
              className="w-full mt-4 bg-foreground py-4 text-background font-bold rounded-[1.5rem] shadow-lg active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                 <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                 <>{isSignUp ? 'Join Rituals' : 'Continue'} <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
