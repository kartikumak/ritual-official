import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export function useAnchors(deckId: string) {
  const { user } = useAuth();
  const supabase = getSupabase();
  const queryClient = useQueryClient();

  const { data: deck, isLoading: isDeckLoading } = useQuery({
    queryKey: ['deck', deckId],
    queryFn: async () => {
      const { data, error } = await supabase.from('decks').select('*').eq('id', deckId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!deckId && !!user,
  });

  const { data: anchors = [], isLoading: isAnchorsLoading } = useQuery({
    queryKey: ['anchors', deckId],
    queryFn: async () => {
      const { data, error } = await supabase.from('anchors').select('*').eq('deck_id', deckId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!deckId && !!user,
  });

  const createAnchorMutation = useMutation({
    mutationFn: async (newAnchor: { word: string; hint: string; reference_answer: string }) => {
      const { data, error } = await supabase.from('anchors').insert({
        deck_id: deckId,
        word: newAnchor.word,
        hint: newAnchor.hint,
        reference_answer: newAnchor.reference_answer,
        level: 'A1'
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anchors', deckId] });
      toast.success('Concept added to collection.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to add concept.');
    }
  });

  const deleteAnchorMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('anchors').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anchors', deckId] });
      toast.success('Concept removed.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to remove concept.');
    }
  });

  return {
    deck,
    anchors,
    isLoading: isDeckLoading || isAnchorsLoading,
    createAnchor: createAnchorMutation.mutate,
    isCreating: createAnchorMutation.isPending,
    deleteAnchor: deleteAnchorMutation.mutate,
  };
}
