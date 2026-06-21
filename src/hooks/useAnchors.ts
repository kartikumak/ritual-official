import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const DEFAULT_ANCHORS: Record<string, any[]> = {
  'neuroscience-101': [
    {
      id: 'n1',
      deck_id: 'neuroscience-101',
      word: 'Long-Term Potentiation (LTP)',
      hint: 'Synaptic strengthening',
      reference_answer: 'A persistent strengthening of synapses based on recent patterns of activity, forming the fundamental cellular mechanisms for learning and memory.',
      level: 'basic',
      keywords: [],
      created_at: new Date().toISOString()
    },
    {
      id: 'n2',
      deck_id: 'neuroscience-101',
      word: 'Hippocampus',
      hint: 'Consolidation hub',
      reference_answer: 'A major component of the brain responsible for consolidating info from short-term memory to long-term memory, and enabling spatial navigation.',
      level: 'basic',
      keywords: [],
      created_at: new Date().toISOString()
    },
    {
      id: 'n3',
      deck_id: 'neuroscience-101',
      word: 'Myelin Sheath',
      hint: 'Axon insulator',
      reference_answer: 'A lipid-rich insulating layer surrounding nerve fibers that greatly increases the speed at which electrical impulses travel along the axon.',
      level: 'basic',
      keywords: [],
      created_at: new Date().toISOString()
    }
  ],
  'study-mechanics': [
    {
      id: 's1',
      deck_id: 'study-mechanics',
      word: 'The Forgetting Curve',
      hint: 'Exponential decline',
      reference_answer: 'A model mapping how information is lost over time when there is no attempt to retain it, illustrating that memory retention drops sharply in the first few days.',
      level: 'basic',
      keywords: [],
      created_at: new Date().toISOString()
    },
    {
      id: 's2',
      deck_id: 'study-mechanics',
      word: 'Active Recall',
      hint: 'Self-testing',
      reference_answer: 'A high-efficiency study technique where you force your brain to retrieve knowledge without looking at notes, establishing deeper cognitive connections.',
      level: 'basic',
      keywords: [],
      created_at: new Date().toISOString()
    },
    {
      id: 's3',
      deck_id: 'study-mechanics',
      word: 'The Leitner System',
      hint: 'Flashcard boxes',
      reference_answer: 'An spaced-repetition methodology using organized boxes of flashcards where correct answers advance cards to further review intervals, and errors send them back.',
      level: 'basic',
      keywords: [],
      created_at: new Date().toISOString()
    }
  ]
};

function getGuestAnchors(deckId: string) {
  if (typeof window === 'undefined') return DEFAULT_ANCHORS[deckId] || [];
  const stored = localStorage.getItem('inlucid_anchors_' + deckId);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return DEFAULT_ANCHORS[deckId] || [];
    }
  }
  const defaults = DEFAULT_ANCHORS[deckId] || [];
  localStorage.setItem('inlucid_anchors_' + deckId, JSON.stringify(defaults));
  return defaults;
}

function saveGuestAnchors(deckId: string, anchors: any[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('inlucid_anchors_' + deckId, JSON.stringify(anchors));
    const storedDecks = localStorage.getItem('inlucid_decks');
    if (storedDecks) {
      try {
        const decks = JSON.parse(storedDecks);
        const deckIndex = decks.findIndex((d: any) => d.id === deckId);
        if (deckIndex !== -1) {
          decks[deckIndex].anchorCount = anchors.length;
          localStorage.setItem('inlucid_decks', JSON.stringify(decks));
        }
      } catch (e) {
        console.error(e);
      }
    }
  }
}

function getLocalDeck(deckId: string) {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('inlucid_decks');
  if (stored) {
    try {
      const decks = JSON.parse(stored);
      return decks.find((d: any) => d.id === deckId) || null;
    } catch (e) {
      return null;
    }
  }
  return null;
}

export function useAnchors(deckId: string) {
  const { user, isGuest } = useAuth();
  const supabase = getSupabase();
  const queryClient = useQueryClient();

  const { data: deck, isLoading: isDeckLoading } = useQuery({
    queryKey: ['deck', deckId, isGuest],
    queryFn: async () => {
      if (isGuest) {
        return getLocalDeck(deckId);
      }
      try {
        const { data, error } = await supabase.from('decks').select('*').eq('id', deckId).single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('Supabase fetch failed, fallback to local deck:', err);
        return getLocalDeck(deckId);
      }
    },
    enabled: !!deckId && !!user,
  });

  const { data: anchors = [], isLoading: isAnchorsLoading } = useQuery({
    queryKey: ['anchors', deckId, isGuest],
    queryFn: async () => {
      if (isGuest) {
        return getGuestAnchors(deckId);
      }
      try {
        const { data, error } = await supabase.from('anchors').select('*').eq('deck_id', deckId).order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn('Supabase fetch failed, fallback to local anchors:', err);
        return getGuestAnchors(deckId);
      }
    },
    enabled: !!deckId && !!user,
  });

  const createAnchorMutation = useMutation({
    mutationFn: async (newAnchor: { word: string; hint: string; reference_answer: string }) => {
      if (isGuest) {
        const anchor = {
          id: 'anchor_' + Math.random().toString(36).substr(2, 9),
          deck_id: deckId,
          word: newAnchor.word,
          hint: newAnchor.hint,
          reference_answer: newAnchor.reference_answer,
          level: 'basic',
          keywords: [],
          created_at: new Date().toISOString()
        };
        const current = getGuestAnchors(deckId);
        const updated = [anchor, ...current];
        saveGuestAnchors(deckId, updated);
        return anchor;
      }
      const { data, error } = await supabase.from('anchors').insert({
        deck_id: deckId,
        word: newAnchor.word,
        hint: newAnchor.hint,
        reference_answer: newAnchor.reference_answer,
        level: 'basic',
        keywords: []
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anchors', deckId, isGuest] });
      queryClient.invalidateQueries({ queryKey: ['decks'] }); // Invalidate decks list to refresh concept count badge
      toast.success('Concept added to collection.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to add concept.');
    }
  });

  const deleteAnchorMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) {
        const current = getGuestAnchors(deckId);
        const updated = current.filter((a: any) => a.id !== id);
        saveGuestAnchors(deckId, updated);
        return id;
      }
      const { error } = await supabase.from('anchors').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anchors', deckId, isGuest] });
      queryClient.invalidateQueries({ queryKey: ['decks'] }); // Invalidate decks list to refresh concept count badge
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
