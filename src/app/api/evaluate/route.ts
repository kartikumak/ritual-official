import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/src/lib/supabase';
import { RecallEngine, SRSEngine } from '@/src/lib/algorithm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, anchor_id, text, session_id, drawing_json, audio_url } = body;
    
    if (!user_id || !anchor_id) {
      return NextResponse.json({ error: 'Missing user_id or anchor_id' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Get Anchor Data
    const { data: anchor, error: anchorError } = await supabase
      .from('anchors')
      .select('*')
      .eq('id', anchor_id)
      .single();

    if (anchorError || !anchor) {
      console.error('Anchor fetch error:', anchorError);
      throw new Error('Anchor not found');
    }
    
    // 2. Evaluate
    const evalResult = RecallEngine.evaluate(text, anchor);

    // 3. Get Progress
    let { data: progress, error: progError } = await supabase
      .from('anchor_progress')
      .select('*')
      .eq('user_id', user_id)
      .eq('anchor_id', anchor_id)
      .single();

    if (progError && progError.code !== 'PGRST116') {
      console.error('Progress fetch error:', progError);
    }

    if (!progress) {
      progress = { easiness_factor: 2.5, interval_days: 0, repetitions: 0, concept_depth: 0 };
    }

    // 4. Update SRS
    const newSRS = SRSEngine.update(progress, evalResult);

    // 5. Persist Progress
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

    return NextResponse.json({ 
      evalResult, 
      newSRS, 
      depthLabel: SRSEngine.depthLabel(newSRS.concept_depth),
      nextDue: newSRS.due_at
    });
  } catch (error: any) {
    console.error('Internal API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
