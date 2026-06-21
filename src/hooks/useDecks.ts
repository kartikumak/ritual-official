import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const DEFAULT_DECKS = [
  {
    id: 'neuroscience-101',
    user_id: '00000000-0000-0000-0000-000000000000',
    name: '🧠 Cognitive Neuroscience',
    description: 'How the brain processes memory, attention, and cognitive flow.',
    category: 'General',
    is_public: false,
    created_at: new Date().toISOString(),
    anchorCount: 3
  },
  {
    id: 'study-mechanics',
    user_id: '00000000-0000-0000-0000-000000000000',
    name: '⚡ Spaced Repetition Mastery',
    description: 'Unlocking the science behind memory decay and active recall.',
    category: 'General',
    is_public: false,
    created_at: new Date().toISOString(),
    anchorCount: 3
  }
];

function getGuestDecks() {
  if (typeof window === 'undefined') return DEFAULT_DECKS;
  const stored = localStorage.getItem('inlucid_decks');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return DEFAULT_DECKS;
    }
  }
  localStorage.setItem('inlucid_decks', JSON.stringify(DEFAULT_DECKS));
  return DEFAULT_DECKS;
}

function saveGuestDecks(decks: any[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('inlucid_decks', JSON.stringify(decks));
  }
}

export function useDecks() {
  const { user, isGuest } = useAuth();
  const supabase = getSupabase();
  const queryClient = useQueryClient();

  const { data: decks = [], isLoading, error } = useQuery({
    queryKey: ['decks', user?.id, isGuest],
    queryFn: async () => {
      if (!user) return [];
      if (isGuest) {
        return getGuestDecks();
      }
      try {
        const { data, error } = await supabase
          .from('decks')
          .select('*, anchors(id)')
          .eq('user_id', user.id);
          
        if (error) throw error;
        return data?.map(d => ({ ...d, anchorCount: d.anchors?.length || 0 })) || [];
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to guest mode:', err);
        return getGuestDecks();
      }
    },
    enabled: !!user,
  });

  const createDeckMutation = useMutation({
    mutationFn: async (newDeck: { name: string; description: string; category: string }) => {
      if (!user) throw new Error("Not logged in");
      if (isGuest) {
        const deck = {
          id: 'deck_' + Math.random().toString(36).substr(2, 9),
          user_id: user.id,
          name: newDeck.name,
          description: newDeck.description,
          category: newDeck.category,
          is_public: false,
          created_at: new Date().toISOString(),
          anchorCount: 0
        };
        const current = getGuestDecks();
        const updated = [...current, deck];
        saveGuestDecks(updated);
        return deck;
      }
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
      queryClient.invalidateQueries({ queryKey: ['decks', user?.id, isGuest] });
      toast.success('Deck created securely.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create deck.');
    }
  });

  const deleteDeckMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) {
        const current = getGuestDecks();
        const updated = current.filter((d: any) => d.id !== id);
        saveGuestDecks(updated);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('inlucid_anchors_' + id);
        }
        return id;
      }
      const { error } = await supabase.from('decks').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks', user?.id, isGuest] });
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
