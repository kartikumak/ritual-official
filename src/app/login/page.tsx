'use client';

import { useAuth } from '@/src/context/AuthContext';
import { motion } from 'framer-motion';
import { Orbit, Sparkles, AlertCircle } from 'lucide-react';
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
        if (!name) throw new Error('Please enter your name');
        const { error } = await signUpWithEmail(email, password, name);
        if (error) throw error;
        alert('Check your email for the confirmation link!');
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
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center bg-background relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 bg-[radial-gradient(circle_at_50%_-20%,var(--primary)_0%,transparent_60%)] opacity-10" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-8"
      >
        <div className="w-16 h-16 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-inner">
          <Orbit size={32} className="text-primary animate-pulse" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Rituals</h1>
        <p className="text-muted-foreground text-xs max-w-[280px] mx-auto leading-relaxed">
          Spaced repetition for modern thinkers.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm"
      >
        <div className="bg-card border border-border rounded-[2rem] p-8 shadow-xl">
          <div className="flex gap-4 mb-8">
            <button 
              onClick={() => setIsSignUp(false)}
              className={cn(
                "flex-1 pb-2 text-xs font-bold transition-all",
                !isSignUp ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
              )}
            >
              SIGN IN
            </button>
            <button 
              onClick={() => setIsSignUp(true)}
              className={cn(
                "flex-1 pb-2 text-xs font-bold transition-all",
                isSignUp ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
              )}
            >
              SIGN UP
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="text-left">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 mb-1.5 block">Full Name</label>
                <input 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-12 bg-muted/5 border border-border rounded-xl px-4 text-sm focus:border-primary outline-none transition-all" 
                  placeholder="Your Name" 
                />
              </div>
            )}
            <div className="text-left">
              <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 mb-1.5 block">Email Address</label>
              <input 
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 bg-muted/5 border border-border rounded-xl px-4 text-sm focus:border-primary outline-none transition-all" 
                placeholder="name@company.com" 
              />
            </div>
            <div className="text-left">
              <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 mb-1.5 block">Password</label>
              <input 
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 bg-muted/5 border border-border rounded-xl px-4 text-sm focus:border-primary outline-none transition-all" 
                placeholder="••••••••" 
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-rose-500 text-[10px] text-left">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <button
              disabled={isSubmitting}
              className="w-full h-12 bg-primary text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
            >
              {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (isSignUp ? 'CREATE ACCOUNT' : 'UNFOLD RITUALS')}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
             <div className="flex-1 h-[1px] bg-muted/20" />
             <span className="text-[10px] font-bold text-muted-foreground">OR</span>
             <div className="flex-1 h-[1px] bg-muted/20" />
          </div>

          <button
            disabled
            className="w-full h-12 bg-white border border-border rounded-xl flex items-center justify-center gap-3 font-semibold shadow-sm opacity-60 cursor-not-allowed group relative"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94L5.84 14.1z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="text-xs">Continue with Google</span>
            <div className="absolute -top-2 -right-2 bg-muted text-[8px] font-bold px-2 py-0.5 rounded-full border border-border shadow-sm text-muted-foreground uppercase tracking-widest">
              Soon
            </div>
          </button>
        </div>
        
        <p className="mt-8 text-[10px] text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-2">
          <Sparkles size={10} />
          Science based learning
        </p>
      </motion.div>

      <div className="absolute bottom-8 text-[10px] text-muted-foreground font-medium flex gap-4">
        <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
        <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
        <Link href="/about" className="hover:text-primary transition-colors">About</Link>
      </div>
    </div>
  );
}
