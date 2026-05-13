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
    username: '',
    display_name: '',
    bio: '',
    country: '',
    native_language: '',
    learning_languages: '',
    learning_goals: '',
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
        username: data.username || '',
        display_name: data.display_name || data.name || '',
        bio: data.bio || '',
        country: data.country || '',
        native_language: data.native_language || '',
        learning_languages: data.learning_languages ? data.learning_languages.join(', ') : '',
        learning_goals: data.learning_goals || '',
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
      username: formData.username,
      display_name: formData.display_name,
      name: formData.display_name,
      bio: formData.bio,
      country: formData.country,
      native_language: formData.native_language,
      learning_languages: formData.learning_languages.split(',').map(s => s.trim()).filter(Boolean),
      learning_goals: formData.learning_goals,
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
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <div className="max-w-[420px] mx-auto px-5 py-12 pb-32">
        <header className="flex items-center justify-between mb-10">
          <button 
            onClick={() => router.back()} 
            className="btn-icon bg-secondary text-muted hover:text-primary transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-right">
            <h1 className="text-[24px] font-serif font-semibold leading-none mb-1">Identity</h1>
            <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-muted">Your Synthesis</p>
          </div>
        </header>

        <div className="space-y-8">
          {/* Avatar Section */}
          <section className="flex flex-col items-center py-8">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full bg-primary-lighter flex items-center justify-center border-[2.5px] border-primary shadow-lg overflow-hidden">
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[32px] font-serif font-bold text-primary">{getInitials(formData.display_name || user?.email || "?")}</span>
                )}
              </div>
              <button className="absolute -right-1 -bottom-1 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center shadow-md active:scale-90 transition-transform">
                 <Camera size={16} />
              </button>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">{formData.display_name || "Unnamed Explorer"}</h2>
              <p className="text-[11px] font-medium text-muted uppercase tracking-wider">
                {formData.username ? `@${formData.username}` : user?.email}
              </p>
            </div>
          </section>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card-sm p-5 text-center">
              <div className="w-10 h-10 rounded-xl bg-accent-green/10 flex items-center justify-center text-accent-green mx-auto mb-2 shadow-sm">
                <Activity size={18} />
              </div>
              <p className="text-[10px] font-bold uppercase text-muted mb-1">Total Rites</p>
              <p className="text-[20px] font-bold text-foreground">{profile?.total_rituals || 0}</p>
            </div>
            <div className="card-sm p-5 text-center">
              <div className="w-10 h-10 rounded-xl bg-accent-yellow/10 flex items-center justify-center text-accent-yellow mx-auto mb-2 shadow-sm">
                <Award size={18} />
              </div>
              <p className="text-[10px] font-bold uppercase text-muted mb-1">Mastery</p>
              <p className="text-[20px] font-bold text-foreground">Lvl {Math.floor((profile?.total_rituals || 0) / 10) + 1}</p>
            </div>
          </div>

          {/* Configuration Forms */}
          <section className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider px-1">Display Name</label>
                <input 
                  value={formData.display_name}
                  onChange={e => setFormData({...formData, display_name: e.target.value})}
                  placeholder="Enter your name..."
                  className="field py-3.5"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider px-1">Username</label>
                <input 
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value.toLowerCase()})}
                  placeholder="@username"
                  className="field py-3.5"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider px-1">Bio</label>
                <textarea 
                  value={formData.bio}
                  onChange={e => setFormData({...formData, bio: e.target.value})}
                  placeholder="Short description of your learning journey..."
                  className="field py-3.5 min-h-[80px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted uppercase tracking-wider px-1">Native Language</label>
                  <input 
                    value={formData.native_language}
                    onChange={e => setFormData({...formData, native_language: e.target.value})}
                    placeholder="e.g. English"
                    className="field py-3.5"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted uppercase tracking-wider px-1">Country</label>
                  <input 
                    value={formData.country}
                    onChange={e => setFormData({...formData, country: e.target.value})}
                    placeholder="e.g. USA"
                    className="field py-3.5"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider px-1">Learning Languages</label>
                <input 
                  value={formData.learning_languages}
                  onChange={e => setFormData({...formData, learning_languages: e.target.value})}
                  placeholder="e.g. Japanese, Spanish (comma separated)"
                  className="field py-3.5"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider px-1">Weekly Goal (Anchors)</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number"
                    value={formData.weekly_goal}
                    onChange={e => setFormData({...formData, weekly_goal: parseInt(e.target.value) || 0})}
                    className="field flex-1 py-3.5"
                  />
                  <div className="w-12 h-12 rounded-[--radius-md] bg-primary-lighter flex items-center justify-center text-primary shadow-sm">
                    <Target size={24} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="flex gap-3 pt-6">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary flex-1 py-4 text-[13px] font-bold uppercase tracking-widest"
            >
              <Save size={18} />
              {isSaving ? "Saving..." : "Save Identity"}
            </button>
            <button 
              onClick={signOut}
              className="btn-outline w-14 h-14 bg-white rounded-full text-accent-orange border-accent-orange/20"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
