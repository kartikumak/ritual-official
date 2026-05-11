import { type NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/src/lib/supabase';
import { RecallEngine, SRSEngine } from '@/src/lib/algorithm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, anchor_id, text, session_id, drawing_json, audio_url } = body;
    const supabase = getSupabase();

    // 1. Get Anchor Data
    const { data: anchor, error: anchorError } = await supabase
      .from('anchors')
      .select('*')
      .eq('id', anchor_id)
      .single();

    if (anchorError || !anchor) throw new Error('Anchor not found');
    
    // 2. Evaluate
    const evalResult = RecallEngine.evaluate(text, anchor);

    // 3. Get Progress
    let { data: progress, error: progError } = await supabase
      .from('anchor_progress')
      .select('*')
      .eq('user_id', user_id)
      .eq('anchor_id', anchor_id)
      .single();

    if (progError && progError.code === 'PGRST116') {
      progress = { easiness_factor: 2.5, interval_days: 0, repetitions: 0, concept_depth: 0 };
    }

    // 4. Update SRS
    const newSRS = SRSEngine.update(progress, evalResult);

    // 5. Persist
    const { error: upsertError } = await supabase
      .from('anchor_progress')
      .upsert({
        user_id,
        anchor_id,
        ...newSRS,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,anchor_id' });

    if (upsertError) throw upsertError;

    // 6. Log Review
    await supabase.from('review_logs').insert({
      user_id,
      anchor_id,
      session_id,
      score: evalResult.score,
      recall_level: evalResult.level,
      response_text: text,
      drawing_json,
      audio_url
    });

    return NextResponse.json({ evalResult, newSRS, depthLabel: SRSEngine.depthLabel(newSRS.concept_depth) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
