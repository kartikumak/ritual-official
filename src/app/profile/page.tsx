'use client';

import { motion } from "framer-motion";
import { ChevronLeft, Camera, LogOut, BookOpen, Activity, Target } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { getSupabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { getInitials, cn } from "@/src/lib/utils";
import Link from "next/link";

export default function ProfilePage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState({ totalRecalls: 0, activeDecks: 0, streak: 0 });
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    learning_languages: '',
    avatar_url: '',
  });

  const supabase = getSupabase();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (user) fetchProfile();
  }, [user, authLoading]);

  const fetchProfile = async () => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
      const { count: anchorsCount } = await supabase.from('review_logs').select('*', { count: 'exact', head: true }).eq('user_id', user?.id);
      const { count: decksCount } = await supabase.from('decks').select('*', { count: 'exact', head: true }).eq('user_id', user?.id);
      // Rough streak simulation based on weekly goal if active
      
      if (data) {
        setProfile(data);
        setStats({
          totalRecalls: anchorsCount || 0,
          activeDecks: decksCount || 0,
          streak: Math.floor((anchorsCount || 0) / 10) // Just a placeholder formula
        });
        setFormData({
          name: data.name || data.display_name || '',
          bio: data.bio || '',
          learning_languages: data.learning_languages ? data.learning_languages.join(', ') : '',
          avatar_url: data.avatar_url || '',
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return alert("Image should be less than 2MB");
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, avatar_url: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase.from('profiles').update({
      name: formData.name,
      display_name: formData.name,
      bio: formData.bio,
      learning_languages: formData.learning_languages.split(',').map(s => s.trim()).filter(Boolean),
      avatar_url: formData.avatar_url,
    }).eq('id', user?.id as string);

    if (!error) {
      setIsEditing(false);
      fetchProfile();
    } else {
      alert("Update failed: " + error.message);
    }
    setIsSaving(false);
  };

  if (loading) return (
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
        <button onClick={signOut} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-accent-pink hover:bg-accent-pink/10 transition-colors shadow-sm">
           <LogOut size={16} className="ml-1" />
        </button>
      </header>

      <main className="max-w-xl mx-auto px-6 w-full relative z-10 mt-4">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-[2.5rem] p-8 shadow-lg border border-white/20 text-center mb-8 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
          <div className="relative w-28 h-28 mx-auto mb-6">
            <div className="w-full h-full rounded-full p-1 bg-gradient-to-tr from-primary to-accent-cyan shadow-md">
              <div className="w-full h-full rounded-full border-4 border-background overflow-hidden bg-secondary">
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-serif text-primary">
                    {getInitials(formData.name || user?.email || "?")}
                  </div>
                )}
              </div>
            </div>
            {isEditing && (
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-foreground rounded-full flex items-center justify-center text-background cursor-pointer shadow-lg hover:scale-110 transition-transform">
                <Camera size={14} />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            )}
          </div>
          
          {isEditing ? (
            <div className="space-y-4 max-w-xs mx-auto">
              <input 
                 value={formData.name}
                 onChange={e => setFormData({...formData, name: e.target.value})}
                 className="w-full bg-secondary border border-transparent rounded-[1.5rem] px-5 py-3 text-sm font-bold text-center outline-none focus:border-primary/30"
                 placeholder="Your Name"
              />
              <textarea 
                 value={formData.bio}
                 onChange={e => setFormData({...formData, bio: e.target.value})}
                 className="w-full bg-secondary border border-transparent rounded-[1.5rem] px-5 py-3 text-sm text-center outline-none min-h-[80px] resize-none focus:border-primary/30"
                 placeholder="Short bio..."
              />
              <input 
                 value={formData.learning_languages}
                 onChange={e => setFormData({...formData, learning_languages: e.target.value})}
                 className="w-full bg-secondary border border-transparent rounded-[1.5rem] px-5 py-3 text-sm text-center outline-none focus:border-primary/30"
                 placeholder="Subjects (e.g. Math, Biology)"
              />
              <button onClick={handleSave} disabled={isSaving} className="w-full py-4 bg-primary text-white rounded-[1.5rem] font-bold shadow-glow-purple disabled:opacity-50 mt-4 text-sm">
                {isSaving ? "Saving..." : "Save Identity"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <h1 className="text-3xl font-serif text-foreground">{formData.name || "Explorer"}</h1>
              {formData.bio && <p className="text-sm text-muted max-w-[260px] mx-auto">{formData.bio}</p>}
              {formData.learning_languages && (
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {formData.learning_languages.split(',').map((subj, i) => subj.trim() && (
                    <span key={i} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest">
                      {subj.trim()}
                    </span>
                  ))}
                </div>
              )}
              <button onClick={() => setIsEditing(true)} className="mt-6 px-6 py-2.5 rounded-full border border-border text-xs font-bold text-muted hover:text-foreground transition-colors hover:bg-secondary">
                Edit Profile
              </button>
            </div>
          )}
        </motion.div>

        {/* Stats Section */}
        {!isEditing && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 sm:grid-cols-3 gap-4">
             <div className="bg-card rounded-[1.5rem] p-6 shadow-sm border border-white/10 text-center">
               <div className="w-10 h-10 rounded-full bg-accent-cyan/10 text-accent-cyan flex items-center justify-center mx-auto mb-3">
                 <Activity size={18} />
               </div>
               <p className="text-3xl font-bold text-foreground mb-1">{stats.totalRecalls}</p>
               <p className="text-[10px] uppercase font-bold tracking-widest text-muted">Total Recalls</p>
             </div>
             <div className="bg-card rounded-[1.5rem] p-6 shadow-sm border border-white/10 text-center">
               <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                 <BookOpen size={18} />
               </div>
               <p className="text-3xl font-bold text-foreground mb-1">{stats.activeDecks}</p>
               <p className="text-[10px] uppercase font-bold tracking-widest text-muted">Concepts</p>
             </div>
             <div className="bg-card rounded-[1.5rem] p-6 shadow-sm border border-white/10 text-center col-span-2 sm:col-span-1">
               <div className="w-10 h-10 rounded-full bg-accent-yellow/10 text-accent-yellow flex items-center justify-center mx-auto mb-3">
                 <Target size={18} />
               </div>
               <p className="text-3xl font-bold text-foreground mb-1">{stats.streak}</p>
               <p className="text-[10px] uppercase font-bold tracking-widest text-muted">Day Streak</p>
             </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
