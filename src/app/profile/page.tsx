'use client';

import { motion } from "framer-motion";
import { User, Mail, Shield, Bell, Zap, ChevronLeft, Camera, LogOut, Save, Target, Activity, Award } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { getSupabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { getInitials, cn } from "@/src/lib/utils";

export default function ProfilePage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    avatar_url: '',
    weekly_goal: 140,
    settings: { reminders: true, haptics: true }
  });

  const supabase = getSupabase();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (user) fetchProfile();
  }, [user, authLoading]);

  const fetchProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
    if (data) {
      setProfile(data);
      setFormData({
        name: data.name || '',
        avatar_url: data.avatar_url || '',
        weekly_goal: data.weekly_goal || 140,
        settings: data.settings || { reminders: true, haptics: true }
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase.from('profiles').update({
      name: formData.name,
      avatar_url: formData.avatar_url,
      weekly_goal: formData.weekly_goal,
      settings: formData.settings
    }).eq('id', user?.id as string);

    if (!error) {
      alert("Neural pulse synchronized!");
      fetchProfile();
    } else {
      alert("Synchronization failed: " + error.message);
    }
    setIsSaving(false);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Background Blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] bg-primary/10 rounded-full blur-[140px] animate-blob" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/5 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '5s' }} />
      </div>

      <div className="max-w-2xl mx-auto px-6 sm:px-10 py-10 sm:py-16 pb-32 relative z-10">
        <header className="flex flex-col sm:flex-row items-center sm:items-center gap-6 sm:gap-8 mb-12 sm:mb-16 text-center sm:text-left transition-all">
          <button 
            onClick={() => router.back()} 
            className="w-14 h-14 rounded-[1.8rem] bg-card shadow-neumorphic flex items-center justify-center text-muted-foreground hover:text-primary transition-all border border-white/5 active:scale-95"
          >
            <ChevronLeft size={28} />
          </button>
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight leading-none">Neural Identity</h1>
            <p className="text-[10px] font-black tracking-[0.2em] uppercase text-muted-foreground/30">Profile & Cognitive Settings</p>
          </div>
        </header>

        <div className="space-y-10 sm:space-y-12">
          {/* Avatar Section */}
          <section className="flex flex-col items-center gap-8 p-10 sm:p-12 rounded-[3rem] sm:rounded-[4rem] bg-card border border-white/5 shadow-neumorphic relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/20 transition-colors" />
            
            <div className="relative">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[2.5rem] sm:rounded-[3rem] bg-white/5 p-1 flex items-center justify-center overflow-hidden border border-white/5 shadow-inner">
                <div className="w-full h-full rounded-[2.3rem] sm:rounded-[2.8rem] overflow-hidden bg-primary/5 flex items-center justify-center">
                  {formData.avatar_url ? (
                    <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl sm:text-5xl font-serif font-black text-primary">{getInitials(formData.name || user?.email || "?")}</span>
                  )}
                </div>
              </div>
              <button className="absolute -right-2 -bottom-2 sm:-right-3 sm:-bottom-3 w-12 h-12 sm:w-14 sm:h-14 rounded-[1.2rem] sm:rounded-[1.5rem] bg-foreground text-card flex items-center justify-center shadow-glow active:scale-90 transition-transform group-hover:scale-110">
                 <Camera size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="text-center space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">Synchronized Account</p>
              <div className="px-6 py-2 rounded-full bg-white/5 border border-white/5 text-sm font-bold text-foreground">
                {user?.email}
              </div>
            </div>
          </section>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-6">
            <div className="p-8 rounded-[2.5rem] bg-card border border-white/5 shadow-neumorphic text-center space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mx-auto mb-2">
                <Activity size={18} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">Total Rites</p>
              <p className="text-xl font-black">{profile?.total_rituals || 0}</p>
            </div>
            <div className="p-8 rounded-[2.5rem] bg-card border border-white/5 shadow-neumorphic text-center space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto mb-2">
                <Award size={18} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">Mastery</p>
              <p className="text-xl font-black">Level {Math.floor((profile?.total_rituals || 0) / 10) + 1}</p>
            </div>
          </div>

          {/* Configuration Forms */}
          <div className="space-y-10">
            <section className="space-y-6">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 ml-6">Personal Synthesis</h2>
              <div className="p-10 rounded-[3.5rem] bg-card border border-white/5 shadow-neumorphic space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Entity Name</label>
                  <input 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter your entity name..."
                    className="w-full h-16 bg-white/5 shadow-neumorphic-inset rounded-[1.5rem] px-8 text-lg font-bold outline-none border border-transparent focus:border-primary/20 transition-all text-foreground"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Universal Asset URL</label>
                  <input 
                    value={formData.avatar_url}
                    onChange={e => setFormData({...formData, avatar_url: e.target.value})}
                    className="w-full h-16 bg-white/5 shadow-neumorphic-inset rounded-[1.5rem] px-8 text-sm font-bold outline-none border border-transparent focus:border-primary/20 transition-all text-foreground"
                    placeholder="https://images.ritual.io/..."
                  />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 ml-6">Cognitive Thresholds</h2>
              <div className="p-10 rounded-[3.5rem] bg-card border border-white/5 shadow-neumorphic flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-[1.5rem] bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                    <Target size={28} />
                  </div>
                  <div>
                    <p className="text-lg font-serif font-black tracking-tight">Recall Velocity</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">{formData.weekly_goal} bits / week</p>
                  </div>
                </div>
                <div className="relative group">
                  <input 
                    type="number"
                    value={formData.weekly_goal}
                    onChange={e => setFormData({...formData, weekly_goal: parseInt(e.target.value) || 0})}
                    className="w-24 h-16 bg-white/5 shadow-neumorphic-inset rounded-[1.5rem] px-4 text-center text-xl font-black outline-none border border-transparent focus:border-primary/20"
                  />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
                </div>
              </div>
            </section>
          </div>

          {/* Terminal Actions */}
          <div className="flex gap-6">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 h-20 bg-primary text-white font-black rounded-[2.5rem] shadow-glow active:scale-95 transition-all text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-4 group"
            >
              <Save size={24} className="group-hover:scale-110 transition-transform" />
              {isSaving ? "Synchronizing..." : "Transmit Pulse"}
            </button>
            <button 
              onClick={signOut}
              className="h-20 w-20 bg-white/5 border border-white/10 shadow-neumorphic rounded-[2.5rem] text-rose-500 flex items-center justify-center active:scale-95 transition-all hover:bg-rose-500/10"
            >
              <LogOut size={28} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
