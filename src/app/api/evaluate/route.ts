import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/src/lib/supabase';
import { RecallEngine, SRSEngine } from '@/src/lib/algorithm';

// In-memory rate limiter
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const MAX_REQUESTS = 300; // Limit per user per day
const WINDOW_MS = 24 * 60 * 60 * 1000;

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
    },
    {
      id: 'n2',
      deck_id: 'neuroscience-101',
      word: 'Hippocampus',
      hint: 'Consolidation hub',
      reference_answer: 'A major component of the brain responsible for consolidating info from short-term memory to long-term memory, and enabling spatial navigation.',
      level: 'basic',
      keywords: [],
    },
    {
      id: 'n3',
      deck_id: 'neuroscience-101',
      word: 'Myelin Sheath',
      hint: 'Axon insulator',
      reference_answer: 'A lipid-rich insulating layer surrounding nerve fibers that greatly increases the speed at which electrical impulses travel along the axon.',
      level: 'basic',
      keywords: [],
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
    },
    {
      id: 's2',
      deck_id: 'study-mechanics',
      word: 'Active Recall',
      hint: 'Self-testing',
      reference_answer: 'A high-efficiency study technique where you force your brain to retrieve knowledge without looking at notes, establishing deeper cognitive connections.',
      level: 'basic',
      keywords: [],
    },
    {
      id: 's3',
      deck_id: 'study-mechanics',
      word: 'The Leitner System',
      hint: 'Flashcard boxes',
      reference_answer: 'An spaced-repetition methodology using organized boxes of flashcards where correct answers advance cards to further review intervals, and errors send them back.',
      level: 'basic',
      keywords: [],
    }
  ]
};

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    
    // Size limit check (e.g. 5MB)
    if (rawBody.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    const body = JSON.parse(rawBody);
    const { user_id, anchor_id, text, session_id, drawing_json, audio_url, anchor: guestAnchor, progress: guestProgress } = body;
    
    if (!user_id || !anchor_id) {
      return NextResponse.json({ error: 'Missing user_id or anchor_id' }, { status: 400 });
    }

    // Rate Limiter
    const now = Date.now();
    const rateRecord = rateLimitMap.get(user_id);
    if (!rateRecord || now > rateRecord.resetTime) {
      rateLimitMap.set(user_id, { count: 1, resetTime: now + WINDOW_MS });
    } else {
      if (rateRecord.count >= MAX_REQUESTS) {
        return NextResponse.json({ error: 'Daily request limit reached' }, { status: 429 });
      }
      rateRecord.count += 1;
    }

    const isGuest = user_id === '00000000-0000-0000-0000-000000000000';

    // 1. Get Anchor Data
    let anchor = guestAnchor;
    if (!anchor) {
      if (isGuest) {
        const list = [...(DEFAULT_ANCHORS['neuroscience-101']), ...(DEFAULT_ANCHORS['study-mechanics'])];
        anchor = list.find(a => a.id === anchor_id);
      } else {
        const supabase = getSupabaseAdmin();
        const { data, error: anchorError } = await supabase
          .from('anchors')
          .select('*')
          .eq('id', anchor_id)
          .single();

        if (anchorError || !data) {
          console.error('Anchor fetch error:', anchorError);
          throw new Error('Anchor not found');
        }
        anchor = data;
      }
    }

    if (!anchor) {
      throw new Error('Anchor details not found');
    }
    
    // 2. Evaluate
    const evalResult = RecallEngine.evaluate(text, anchor);

    // 3. Get Progress
    let progress = guestProgress;
    if (!progress) {
      if (isGuest) {
        progress = { easiness_factor: 2.5, interval_days: 0, repetitions: 0, concept_depth: 0 };
      } else {
        const supabase = getSupabaseAdmin();
        let { data, error: progError } = await supabase
          .from('anchor_progress')
          .select('*')
          .eq('user_id', user_id)
          .eq('anchor_id', anchor_id)
          .single();

        if (progError && progError.code !== 'PGRST116') {
          console.error('Progress fetch error:', progError);
        }
        progress = data;
      }
    }

    if (!progress) {
      progress = { easiness_factor: 2.5, interval_days: 0, repetitions: 0, concept_depth: 0 };
    }

    // 4. Update SRS
    const newSRS = SRSEngine.update(progress, evalResult);

    // 5. Persist Progress (Skip if Guest)
    if (!isGuest) {
      const supabase = getSupabaseAdmin();
      const { error: upsertError } = await supabase
        .from('anchor_progress')
        .upsert({
          user_id,
          anchor_id,
          ...newSRS,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,anchor_id' });

      if (upsertError) {
        console.error('Progress upsert error:', upsertError);
        throw upsertError;
      }

      // 6. Log Review
      const { error: logError } = await supabase.from('review_logs').insert({
        user_id,
        anchor_id,
        session_id,
        score: evalResult.score,
        recall_level: evalResult.level,
        response_text: text,
        drawing_json,
        audio_url
      });

      if (logError) {
        console.error('Review log insertion error:', logError);
      }
    }

    return NextResponse.json({ 
      evalResult, 
      newSRS, 
      depthLabel: SRSEngine.depthLabel(newSRS.concept_depth),
      nextDue: newSRS.due_at || new Date(Date.now() + (newSRS.interval_days || 1) * 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error: any) {
    console.error('Internal API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
