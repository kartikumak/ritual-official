import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const DEFAULT_PROFILE = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'learner@inlucid.app',
  name: 'Learner',
  bio: 'Exploring active recall and spatial mnemonic spacing.',
  learning_languages: ['Cognitive Psychology', 'Neuroscience'],
  avatar_url: ''
};

function getGuestProfile() {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  const stored = localStorage.getItem('inlucid_profile');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return DEFAULT_PROFILE;
    }
  }
  localStorage.setItem('inlucid_profile', JSON.stringify(DEFAULT_PROFILE));
  return DEFAULT_PROFILE;
}

function saveGuestProfile(profile: any) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('inlucid_profile', JSON.stringify(profile));
  }
}

function getGuestStats() {
  if (typeof window === 'undefined') return { total: 0, weekly: 0, activeDecks: 2 };
  
  let total = 0;
  let weekly = 0;
  const logsStored = localStorage.getItem('inlucid_review_logs');
  if (logsStored) {
    try {
      const logs = JSON.parse(logsStored);
      total = logs.length;
      weekly = logs.filter((l: any) => new Date(l.reviewed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;
    } catch (e) {}
  }
  
  let activeDecks = 2; // Default starting decks
  const decksStored = localStorage.getItem('inlucid_decks');
  if (decksStored) {
    try {
      activeDecks = JSON.parse(decksStored).length;
    } catch (e) {}
  }
  
  return { total, weekly, activeDecks };
}

export function useProfile() {
  const { user, isGuest } = useAuth();
  const supabase = getSupabase();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', user?.id, isGuest],
    queryFn: async () => {
      if (!user) return null;
      if (isGuest) {
        return getGuestProfile();
      }
      try {
        let { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        
        if (!data) {
          // Auto-create
          const { data: newProfile, error: insertError } = await supabase.from('profiles').insert({
            id: user.id, 
            email: user.email, 
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Explorer'
          }).select().single();
          if (insertError) throw insertError;
          return newProfile;
        }
        return data;
      } catch (err) {
        console.warn('Supabase profile failed, fallback to local', err);
        return getGuestProfile();
      }
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ['stats', user?.id, isGuest],
    queryFn: async () => {
      if (!user) return { total: 0, weekly: 0, activeDecks: 0 };
      if (isGuest) {
        return getGuestStats();
      }
      try {
        const { data: logs, error } = await supabase.from('review_logs').select('reviewed_at').eq('user_id', user.id);
        if (error) throw error;
        
        const { count: decksCount } = await supabase.from('decks').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
        
        const total = logs?.length || 0;
        const weekly = logs?.filter(l => new Date(l.reviewed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length || 0;
        
        return { total, weekly, activeDecks: decksCount || 0 };
      } catch (err) {
        console.warn('Supabase stats failed, fallback to local stats', err);
        return getGuestStats();
      }
    },
    enabled: !!user,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      if (!user) throw new Error("Not logged in");
      if (isGuest) {
        const profile = { ...getGuestProfile(), ...updatedData };
        saveGuestProfile(profile);
        return profile;
      }
      const { data, error } = await supabase.from('profiles').update(updatedData).eq('id', user.id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id, isGuest] });
      toast.success('Identity updated.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update identity.');
    }
  });

  return {
    profile,
    stats,
    isLoading,
    error,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
  };
}
