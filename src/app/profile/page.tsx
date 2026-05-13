'use client';

import { motion } from "framer-motion";
import { User, Mail, Shield, Bell, Zap, ChevronLeft, Camera, LogOut, Save, Target, Activity, Award } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { getSupabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { getInitials, cn } from "@/src/lib/utils";

import { ThemeToggle } from "@/src/components/ThemeToggle";

export default function ProfilePage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
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

// ... keep useEffect and fetches
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
      setIsEditing(false);
      fetchProfile();
    } else {
      alert("Synchronization failed: " + error.message);
    }
    setIsSaving(false);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden pb-32">
      {/* Top Bar */}
      <header className="flex items-center justify-between p-4 sticky top-0 bg-background/90 backdrop-blur-md z-40">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-foreground">
          <ChevronLeft size={28} />
        </button>
        <div className="flex items-center gap-4 text-foreground">
          <ThemeToggle className="w-10 h-10 shadow-none border-none bg-transparent" />
          <button className="p-2"><Save size={24} className="opacity-0" /></button> {/* spacer */}
          <button className="p-2 absolute right-16">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
          </button>
          <button className="p-2" onClick={signOut}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </button>
        </div>
      </header>

      <div className="max-w-[420px] mx-auto px-5">
        {/* Profile Info */}
        <div className="flex items-center gap-5 mb-8 mt-4">
          <div className="relative">
            <div className="w-[84px] h-[84px] rounded-full p-1 bg-gradient-to-tr from-primary to-accent-teal">
              <div className="w-full h-full rounded-full border-2 border-background overflow-hidden bg-secondary">
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-primary">
                    {getInitials(formData.display_name || user?.email || "?")}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-[22px] font-bold text-foreground">{formData.display_name || "Unnamed"}</h1>
            </div>
            <div className="flex items-center gap-2 text-muted text-sm mb-3">
              <span>@{formData.username || 'user'}</span>
              <button className="hover:text-foreground"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            </div>
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 w-max pr-4"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              75% Complete
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 ml-1"></span>
            </button>
          </div>
          <ChevronLeft size={24} className="rotate-180 text-muted" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2 text-center mb-8 divide-x divide-border/50">
          <div>
            <p className="text-[20px] font-bold text-foreground mb-1">{profile?.total_rituals || 2}</p>
            <p className="text-xs text-muted font-medium">Moments</p>
          </div>
          <div>
            <p className="text-[20px] font-bold text-foreground mb-1">16</p>
            <p className="text-xs text-muted font-medium">Following</p>
          </div>
          <div>
            <p className="text-[20px] font-bold text-foreground mb-1">20</p>
            <p className="text-xs text-muted font-medium">Followers</p>
          </div>
          <div>
            <p className="text-[20px] font-bold text-foreground mb-1">158</p>
            <p className="text-xs text-muted font-medium">Visitors</p>
          </div>
        </div>

        {/* Edit Profile Form Popup (Hidden unless active) */}
        {isEditing && (
          <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 overflow-y-auto px-5 py-12">
             <div className="max-w-[420px] mx-auto space-y-6">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold">Edit Profile</h2>
                  <button onClick={() => setIsEditing(false)} className="p-2 border rounded-full">✕</button>
                </div>
                {/* Configuration Forms */}
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
                </div>

                <div className="mt-8 pt-8 border-t border-border flex gap-3">
                  <button onClick={handleSave} disabled={isSaving} className="btn-primary flex-1 py-3 text-sm">
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                  <button onClick={signOut} className="btn-outline w-12 h-12 text-rose-500 rounded-xl flex items-center justify-center">
                    <LogOut size={20} />
                  </button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
