'use client';

import { useAuth } from '@/src/context/AuthContext';
import { motion } from 'framer-motion';
import { Orbit, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { signInWithGoogle, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center bg-background relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 bg-[radial-gradient(circle_at_50%_-20%,var(--primary)_0%,transparent_60%)] opacity-10" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-12"
      >
        <div className="w-20 h-20 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Orbit size={42} className="text-primary animate-pulse" />
        </div>
        <h1 className="text-4xl font-serif font-bold text-foreground mb-4">Rituals</h1>
        <p className="text-muted-foreground text-sm max-w-[280px] mx-auto leading-relaxed">
          Master any concept through scientific recall and spaced repetition.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm space-y-4"
      >
        <button
          onClick={signInWithGoogle}
          className="w-full h-14 bg-white border border-border rounded-2xl flex items-center justify-center gap-3 font-semibold shadow-sm hover:bg-muted/5 transition-all group"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94L5.84 14.1z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Continue with Google
        </button>
        
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-2">
          <Sparkles size={10} />
          Science based learning
        </p>
      </motion.div>

      <div className="absolute bottom-8 text-[10px] text-muted-foreground font-medium">
        Built for deep thinkers & continuous learners.
      </div>
    </div>
  );
}
