import { GoogleGenAI } from 'npm:@google/genai@2.29.1';
import { ADVISOR_INSTRUCTION, factsForPrompt, factsHash, packTopics, parseAdvice, pickTopics, restoreProgress, templateAdvice, type Advice, type PackTopic } from '../_shared/advisor.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { signedInStudent } from '../_shared/student.ts';

const PACKS = ['g7-chem', 'g8-chem', 'g9-chem', 'g10-chem'];
/** Saved advice is reused this long while the student's progress gives the same facts. */
const KEEP_MS = 24 * 60 * 60 * 1000;
/** Lesson packs change rarely; a warm function keeps them between requests. */
const PACK_MS = 10 * 60 * 1000;
const packs = new Map<string, { topics: PackTopic[]; at: number }>();

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'), Deno.env.get('ALLOWED_ORIGINS') ?? '');
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const packId = typeof body.pack === 'string' && PACKS.includes(body.pack) ? body.pack : null;
    if (!packId) return json({ error: 'Invalid pack' }, 400);
    const student = await signedInStudent(req);
    if (!student) return json({ error: 'Зөвлөгөө авахын тулд нэвтэрнэ үү.' }, 401);
    const { supabase } = student;

    const cached = packs.get(packId);
    let topics = cached && Date.now() - cached.at < PACK_MS ? cached.topics : null;
    if (!topics) {
      const { data, error } = await supabase.from('lesson_packs').select('content').eq('id', packId).eq('is_published', true).maybeSingle();
      if (error || !data) return json({ error: 'Хичээлийн агуулга олдсонгүй.' }, 503);
      topics = packTopics(data.content);
      packs.set(packId, { topics, at: Date.now() });
    }
    const { data: snapshot, error: snapshotError } = await supabase.rpc('get_study_snapshot', { p_pack: packId });
    if (snapshotError) {
      console.error('study-advisor snapshot failed', snapshotError);
      return json({ error: 'Явцыг уншиж чадсангүй.' }, 503);
    }

    const facts = pickTopics(topics, restoreProgress(snapshot?.progress));
    if (!facts.length) return json({ advice: [], source: 'rules' });
    const hash = factsHash(facts);
    const saved = snapshot?.saved;
    if (body.refresh !== true && saved?.hash === hash && Date.now() - Date.parse(saved.createdAt) < KEEP_MS && Array.isArray(saved.advice)) {
      return json({ advice: saved.advice, source: 'saved' });
    }

    let advice: Advice[] = templateAdvice(facts);
    let source = 'rules';
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    const { data: allowed } = apiKey ? await supabase.rpc('use_ai_quota', { p_kind: 'advisor' }) : { data: false };
    if (apiKey && allowed) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const interaction = await ai.interactions.create({
          model: 'gemini-3.8-flash',
          store: false,
          system_instruction: ADVISOR_INSTRUCTION,
          input: `FACTS:\n${JSON.stringify(factsForPrompt(facts))}`,
        });
        const worded = parseAdvice(interaction.output_text ?? '', facts);
        if (worded) {
          advice = worded;
          source = 'ai';
        }
      } catch (error) {
        console.error('study-advisor AI failed', error);
      }
    }
    // Template advice is not saved, so the AI's wording replaces it once the AI is reachable again.
    if (source === 'ai') {
      const { error } = await supabase.rpc('save_study_advice', { p_pack: packId, p_hash: hash, p_advice: advice });
      if (error) console.error('study-advisor save failed', error);
    }
    return json({ advice, source });
  } catch (error) {
    console.error('study-advisor failed', error);
    return json({ error: 'Зөвлөгөө бэлдэж чадсангүй.' }, 502);
  }
});
