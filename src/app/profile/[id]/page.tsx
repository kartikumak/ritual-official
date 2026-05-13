'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { ChevronLeft, UserPlus, MessageSquare, ShieldAlert, Award, Activity } from 'lucide-react';
import { getInitials, cn } from '@/src/lib/utils';
import Link from 'next/link';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  const supabase = getSupabase();
  const targetId = params.id as string;

  useEffect(() => {
    if (targetId) fetchProfile();
  }, [targetId]);

  const fetchProfile = async () => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', targetId).single();
    if (data) {
      setProfile(data);
    }
    
    // Check if following
    if (user && user.id !== targetId) {
      const { data: followData } = await supabase.from('follows').select('*').eq('follower_id', user.id).eq('following_id', targetId).single();
      setIsFollowing(!!followData);
    }
    
    setLoading(false);
  };

  const handleFollow = async () => {
    if (!user) return router.push('/login');
    setActionLoading(true);
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId);
      setIsFollowing(false);
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId });
      setIsFollowing(true);
    }
    setActionLoading(false);
  };

  const startChat = async () => {
    if (!user) return router.push('/login');
    // Find or create chat
    const { data: existingChats } = await supabase
      .from('private_chats')
      .select('id')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${targetId}),and(user1_id.eq.${targetId},user2_id.eq.${user.id})`);
      
    if (existingChats && existingChats.length > 0) {
      // Just navigate to chat UI or signal via URL
      // Since our chat lives in the main hub, we can just redirect to /?tab=social
      router.push('/?tab=social');
    } else {
      const { data: newChat, error } = await supabase.from('private_chats').insert({
        user1_id: user.id,
        user2_id: targetId
      }).select().single();
      if (!error) {
        router.push('/?tab=social');
      }
    }
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>;

  if (!profile) return <div className="min-h-screen flex items-center justify-center">Profile not found.</div>;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="max-w-2xl mx-auto px-5 py-12">
        <header className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 rounded-full bg-secondary text-muted hover:text-primary transition-all flex items-center justify-center"
          >
            <ChevronLeft size={20} className="-ml-0.5" />
          </button>
        </header>

        <div className="space-y-8">
           <div className="card p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              <div className="w-24 h-24 rounded-full bg-primary-lighter text-primary border-4 border-white shadow-xl flex items-center justify-center font-serif font-bold text-3xl shrink-0 overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  getInitials(profile.display_name || profile.username || '?')
                )}
              </div>
              
              <div className="flex-1 space-y-2">
                <h1 className="text-2xl font-bold">{profile.display_name || 'Explorer'}</h1>
                <p className="text-sm text-muted">@{profile.username || 'unknown'} {profile.country && `· ${profile.country}`}</p>
                <p className="text-sm mt-3 leading-relaxed">{profile.bio || 'This learner hasn\'t written a bio yet.'}</p>
                
                <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
                   {profile.native_language && (
                     <div className="badge-primary bg-primary/5 text-primary border-primary/10">Native: {profile.native_language}</div>
                   )}
                   {profile.learning_languages && profile.learning_languages.map((l: string) => (
                     <div key={l} className="badge-primary bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Learning: {l}</div>
                   ))}
                </div>
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-4">
             <div className="card-sm p-6 text-center shadow-soft">
               <div className="w-10 h-10 rounded-xl bg-accent-green/10 flex items-center justify-center text-accent-green mx-auto mb-3">
                 <Activity size={18} />
               </div>
               <p className="text-xs font-bold uppercase text-muted mb-1 tracking-wider">Total Rites</p>
               <p className="text-2xl font-bold text-foreground">{profile.total_rituals || 0}</p>
             </div>
             <div className="card-sm p-6 text-center shadow-soft">
               <div className="w-10 h-10 rounded-xl bg-accent-yellow/10 flex items-center justify-center text-accent-yellow mx-auto mb-3">
                 <Award size={18} />
               </div>
               <p className="text-xs font-bold uppercase text-muted mb-1 tracking-wider">Mastery Lvl</p>
               <p className="text-2xl font-bold text-foreground">{Math.floor((profile.total_rituals || 0) / 10) + 1}</p>
             </div>
           </div>

           {user && user.id !== targetId && (
             <div className="flex gap-4 pt-4">
                <button 
                  onClick={handleFollow}
                  disabled={actionLoading}
                  className={cn(
                    "flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all text-sm shadow-sm",
                    isFollowing ? "bg-secondary text-foreground hover:bg-muted-bg" : "btn-primary"
                  )}
                >
                  <UserPlus size={18} />
                  {isFollowing ? 'Following' : 'Follow Learner'}
                </button>
                <button 
                  onClick={startChat}
                  disabled={actionLoading}
                  className="flex-1 py-4 rounded-2xl bg-white border border-border font-bold text-foreground flex items-center justify-center gap-2 hover:bg-muted-bg transition-all text-sm shadow-sm"
                >
                  <MessageSquare size={18} className="text-primary" />
                  Message
                </button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
