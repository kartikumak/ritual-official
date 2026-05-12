'use client';

import { motion } from "framer-motion";
import { User, Mail, Shield, Bell, Zap, ChevronLeft, Camera, LogOut, Save, Target } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { getSupabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { getInitials } from "@/src/lib/utils";

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
      alert("Profile updated successfully!");
      fetchProfile();
    } else {
      alert("Update failed: " + error.message);
    }
    setIsSaving(false);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 pb-32">
      <header className="flex items-center gap-6 mb-12">
        <button onClick={() => router.back()} className="w-12 h-12 rounded-2xl bg-white shadow-neumorphic flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-3xl font-serif font-black tracking-tight">Identity</h1>
      </header>

      <div className="space-y-10">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-6 p-10 rounded-[3rem] bg-white border border-white/60 shadow-neumorphic relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-blob" />
          <div className="relative group">
            <div className="w-32 h-32 rounded-[2.5rem] bg-primary/5 flex items-center justify-center overflow-hidden border border-primary/20 shadow-inner">
               {formData.avatar_url ? (
                 <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
               ) : (
                 <span className="text-4xl font-black text-primary">{getInitials(formData.name || user?.email || "?")}</span>
               )}
            </div>
            <button className="absolute -right-2 -bottom-2 w-10 h-10 rounded-2xl bg-foreground text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform">
               <Camera size={18} />
            </button>
          </div>
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Authenticated via</p>
            <p className="text-sm font-bold text-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Basic Details */}
        <section className="space-y-6">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 ml-4">Profile Details</h2>
          <div className="p-8 rounded-[2.5rem] bg-white border border-white/60 shadow-neumorphic space-y-6">
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-2 block ml-1">Full Name</label>
              <input 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full h-14 bg-white shadow-neumorphic-inset rounded-2xl px-6 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-2 block ml-1">Avatar URL</label>
              <input 
                value={formData.avatar_url}
                onChange={e => setFormData({...formData, avatar_url: e.target.value})}
                className="w-full h-14 bg-white shadow-neumorphic-inset rounded-2xl px-6 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none"
                placeholder="https://..."
              />
            </div>
          </div>
        </section>

        {/* Learning Goals */}
        <section className="space-y-6">
           <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 ml-4">Neural Architecture</h2>
           <div className="p-8 rounded-[2.5rem] bg-white border border-white/60 shadow-neumorphic flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
                  <Target size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold">Weekly Recall Goal</p>
                  <p className="text-xs font-medium text-muted-foreground">{formData.weekly_goal} anchors/week</p>
                </div>
              </div>
              <input 
                type="number"
                value={formData.weekly_goal}
                onChange={e => setFormData({...formData, weekly_goal: parseInt(e.target.value) || 0})}
                className="w-20 h-12 bg-white shadow-neumorphic-inset rounded-xl px-2 text-center text-sm font-black outline-none"
              />
           </div>
        </section>

        {/* Actions */}
        <div className="flex gap-4">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 h-16 bg-primary text-white font-black rounded-3xl shadow-glow active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3"
          >
            <Save size={20} />
            {isSaving ? "Syncing..." : "Update Pulse"}
          </button>
          <button 
            onClick={signOut}
            className="h-16 w-16 bg-white border border-white/60 shadow-neumorphic rounded-3xl text-rose-500 flex items-center justify-center active:scale-95 transition-all"
          >
            <LogOut size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
