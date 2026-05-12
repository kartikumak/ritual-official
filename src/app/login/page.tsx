'use client';

import { useAuth } from '@/src/context/AuthContext';
import { motion } from 'framer-motion';
import { Orbit, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/src/lib/utils';
import Link from 'next/link';

export default function LoginPage() {
  const { signInWithEmail, signUpWithEmail, resetPassword, user, loading } = useAuth();
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
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
      if (isForgotPassword) {
        const { error } = await resetPassword(email);
        if (error) throw error;
        alert('Check your email for the password reset link!');
        setIsForgotPassword(false);
      } else if (isSignUp) {
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
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-blob -z-10" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-400/10 rounded-full blur-[100px] animate-blob -z-10" style={{ animationDelay: '2s' }} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-8 relative z-10"
      >
        <div className="w-20 h-20 bg-white shadow-neumorphic rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-white/60">
          <Orbit size={40} className="text-primary animate-pulse" />
        </div>
        <h1 className="text-4xl font-serif font-bold text-foreground mb-3 tracking-tight">Rituals</h1>
        <p className="text-muted-foreground text-sm max-w-[280px] mx-auto leading-relaxed font-medium">
          Scientific spaced repetition for modern thinkers.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="bg-white/80 backdrop-blur-md border border-white/60 rounded-[3rem] p-10 shadow-neumorphic">
          <div className="flex gap-6 mb-10">
            <button 
              onClick={() => setIsSignUp(false)}
              className={cn(
                "flex-1 pb-3 text-[10px] font-bold tracking-widest transition-all uppercase",
                !isSignUp ? "text-primary border-b-2 border-primary" : "text-muted-foreground/60"
              )}
            >
              Log In
            </button>
            <button 
              onClick={() => setIsSignUp(true)}
              className={cn(
                "flex-1 pb-3 text-[10px] font-bold tracking-widest transition-all uppercase",
                isSignUp ? "text-primary border-b-2 border-primary" : "text-muted-foreground/60"
              )}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {isSignUp && (
              <div className="text-left">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2 mb-2 block">Full Identity</label>
                <input 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-14 bg-white border border-white/60 shadow-neumorphic-inset rounded-2xl px-5 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/30" 
                  placeholder="Your Name" 
                />
              </div>
            )}
            <div className="text-left">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2 mb-2 block">Email Portal</label>
              <input 
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 bg-white border border-white/60 shadow-neumorphic-inset rounded-2xl px-5 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/30" 
                placeholder="name@nexus.com" 
              />
            </div>
            <div className="text-left">
              <div className="flex items-center justify-between ml-2 mb-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Secret Key</label>
                {!isSignUp && (
                  <button type="button" onClick={() => setIsForgotPassword(true)} className="text-[10px] font-bold text-primary hover:underline transition-all">
                    Reset?
                  </button>
                )}
              </div>
              <div className="relative">
                <input 
                  required={!isForgotPassword}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 bg-white border border-white/60 shadow-neumorphic-inset rounded-2xl px-5 pr-14 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/30" 
                  placeholder="••••••••" 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground/50 hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {isForgotPassword && (
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl text-primary text-[10px] text-left leading-relaxed font-medium">
                Enter your email above and we'll send a transmission to reset your key.
              </div>
            )}

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-600 text-[10px] text-left">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p className="font-bold leading-tight">{error}</p>
              </div>
            )}

            <button
              disabled={isSubmitting}
              className="w-full h-14 bg-primary text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center text-sm tracking-wide"
            >
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (isForgotPassword ? 'TRANSFORM PASSWORD' : (isSignUp ? 'INITIALIZE RITUAL' : 'UNFOLD RITUALS'))}
            </button>
          </form>

          <div className="my-10 flex items-center gap-5">
             <div className="flex-1 h-[1px] bg-muted/20" />
             <span className="text-[10px] font-bold text-muted-foreground/40 tracking-widest">OR</span>
             <div className="flex-1 h-[1px] bg-muted/20" />
          </div>

          <button
            disabled
            className="w-full h-14 bg-white border border-white/60 rounded-2xl flex items-center justify-center gap-3 font-bold shadow-neumorphic opacity-60 cursor-not-allowed group relative"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94L5.84 14.1z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="text-xs uppercase tracking-widest">Connect with Google</span>
            <div className="absolute -top-3 -right-2 bg-primary text-[8px] font-bold px-3 py-1 rounded-full border border-white/60 shadow-lg text-white uppercase tracking-[0.2em] animate-pulse">
              Coming
            </div>
          </button>
        </div>
        
        <p className="mt-12 text-[10px] text-muted-foreground uppercase font-bold tracking-[0.3em] flex items-center justify-center gap-3">
          <Sparkles size={12} className="text-primary/70" />
          Neuroscience Architecture
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
