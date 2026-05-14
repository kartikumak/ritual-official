import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export function useDecks() {
  const { user } = useAuth();
  const supabase = getSupabase();
  const queryClient = useQueryClient();

  const { data: decks = [], isLoading, error } = useQuery({
    queryKey: ['decks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('decks')
        .select('*, anchors(id)')
        .eq('user_id', user.id);
        
      if (error) throw error;
      return data?.map(d => ({ ...d, anchorCount: d.anchors?.length || 0 })) || [];
    },
    enabled: !!user,
  });

  const createDeckMutation = useMutation({
    mutationFn: async (newDeck: { name: string; description: string; category: string }) => {
      if (!user) throw new Error("Not logged in");
      const { data, error } = await supabase.from('decks').insert({
        user_id: user.id,
        name: newDeck.name,
        description: newDeck.description,
        category: newDeck.category,
        is_public: false
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks', user?.id] });
      toast.success('Deck created securely.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create deck.');
    }
  });

  const deleteDeckMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('decks').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks', user?.id] });
      toast.success('Deck eliminated.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete deck.');
    }
  });

  return {
    decks,
    isLoading,
    error,
    createDeck: createDeckMutation.mutate,
    isCreating: createDeckMutation.isPending,
    deleteDeck: deleteDeckMutation.mutate,
  };
}
