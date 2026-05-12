'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/src/lib/supabase';
import { motion } from 'framer-motion';
import { Orbit, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const supabase = getSupabase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setError(null);
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      alert('Password updated successfully!');
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <h1 className="text-4xl font-serif font-bold text-foreground mb-3 tracking-tight">Reset Password</h1>
        <p className="text-muted-foreground text-sm font-medium">Re-initialize your neural access.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="bg-white/80 backdrop-blur-md border border-white/60 rounded-[3rem] p-10 shadow-neumorphic text-left">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2 mb-2 block">New Secret Key</label>
              <input 
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-14 bg-white border border-white/60 shadow-neumorphic-inset rounded-2xl px-5 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/30" 
                placeholder="••••••••" 
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2 mb-2 block">Confirm Identity</label>
              <input 
                required
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-14 bg-white border border-white/60 shadow-neumorphic-inset rounded-2xl px-5 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/30" 
                placeholder="••••••••" 
              />
            </div>

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
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'UPDATE ACCESS KEY'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
