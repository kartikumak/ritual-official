import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export function useProfile() {
  const { user } = useAuth();
  const supabase = getSupabase();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
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
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ['stats', user?.id],
    queryFn: async () => {
      if (!user) return { total: 0, weekly: 0, activeDecks: 0 };
      const { data: logs, error } = await supabase.from('review_logs').select('reviewed_at').eq('user_id', user.id);
      if (error) throw error;
      
      const { count: decksCount } = await supabase.from('decks').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      
      const total = logs?.length || 0;
      const weekly = logs?.filter(l => new Date(l.reviewed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length || 0;
      
      return { total, weekly, activeDecks: decksCount || 0 };
    },
    enabled: !!user,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      if (!user) throw new Error("Not logged in");
      const { data, error } = await supabase.from('profiles').update(updatedData).eq('id', user.id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
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
