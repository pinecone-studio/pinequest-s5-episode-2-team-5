import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedOrigin, corsHeaders } from '../supabase/functions/_shared/cors.ts';
import { compactContext } from '../supabase/functions/_shared/tutor-context.ts';
import { factsHash, packTopics, parseAdvice, pickTopics, restoreProgress, templateAdvice } from '../supabase/functions/_shared/advisor.ts';
import { AiHttpError, DEFAULT_GEMINI_MODEL, aiConfig, aiFailure, openAiCompatibleText } from '../supabase/functions/_shared/ai-text.ts';

test('secrets choose the AI: Gemini by default, any OpenAI-compatible service on request', () => {
  const env = (vars) => (name) => vars[name];
  assert.equal(aiConfig(env({})), null);
  assert.deepEqual(aiConfig(env({ GEMINI_API_KEY: ' k ' })), { provider: 'gemini', apiKey: 'k', model: DEFAULT_GEMINI_MODEL });
  assert.equal(aiConfig(env({ GEMINI_API_KEY: 'k', GEMINI_MODEL: 'gemini-2.5-flash' })).model, 'gemini-2.5-flash');
  const groq = { AI_PROVIDER: 'OpenAI', AI_BASE_URL: 'https://api.groq.com/openai/v1/', AI_API_KEY: 'g', AI_MODEL: 'some-model', GEMINI_API_KEY: 'k' };
  assert.deepEqual(aiConfig(env(groq)), { provider: 'openai', apiKey: 'g', model: 'some-model', baseUrl: 'https://api.groq.com/openai/v1' });
  assert.equal(aiConfig(env({ ...groq, AI_MODEL: '' })), null, 'an incomplete setup is reported, not half used');
  assert.equal(aiConfig(env({ ...groq, AI_BASE_URL: 'api.groq.com' })), null);
});

test('an OpenAI-compatible service is called with the system prompt and its errors keep their status', async () => {
  const config = { provider: 'openai', apiKey: 'secret', model: 'm', baseUrl: 'https://ai.example/v1' };
  let sent;
  const ok = async (url, init) => { sent = { url, init }; return new Response(JSON.stringify({ choices: [{ message: { content: 'Сайн байна уу' } }] }), { status: 200 }); };
  assert.equal(await openAiCompatibleText(config, 'system text', 'question', ok), 'Сайн байна уу');
  assert.equal(sent.url, 'https://ai.example/v1/chat/completions');
  assert.equal(sent.init.headers.Authorization, 'Bearer secret');
  assert.deepEqual(JSON.parse(sent.init.body).messages, [{ role: 'system', content: 'system text' }, { role: 'user', content: 'question' }]);
  const failing = (status, message) => async () => new Response(JSON.stringify({ error: { message } }), { status });
  await assert.rejects(openAiCompatibleText(config, 's', 'q', failing(401, 'Invalid API Key')), (e) => e instanceof AiHttpError && e.status === 401 && aiFailure(e).code === 'ai_key');
  await assert.rejects(openAiCompatibleText(config, 's', 'q', failing(429, 'Rate limit reached')), (e) => aiFailure(e).code === 'ai_rate_limit');
  assert.equal(await openAiCompatibleText(config, 's', 'q', async () => new Response('{}', { status: 200 })), '');
  assert.equal(JSON.parse(sent.init.body).reasoning_effort, undefined, 'other models get no reasoning options');
});

test('Groq gpt-oss models think briefly and return only the answer', async () => {
  let body;
  const capture = async (_url, init) => { body = JSON.parse(init.body); return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 }); };
  await openAiCompatibleText({ provider: 'openai', apiKey: 'k', model: 'openai/gpt-oss-120b', baseUrl: 'https://api.groq.com/openai/v1' }, 's', 'q', capture);
  assert.equal(body.reasoning_effort, 'low'); assert.equal(body.include_reasoning, false); assert.equal(body.max_tokens, 2048);
  await openAiCompatibleText({ provider: 'openai', apiKey: 'k', model: 'openai/gpt-oss-120b', baseUrl: 'https://openrouter.ai/api/v1' }, 's', 'q', capture);
  assert.equal(body.reasoning_effort, undefined, 'only Groq takes these options');
  assert.equal(body.max_tokens, 800);
});

test('a failed AI call says why: key, model, rate limit or other', () => {
  assert.equal(aiFailure({ status: 403, message: 'Forbidden' }).code, 'ai_key');
  assert.equal(aiFailure(new Error('API key not valid. Please pass a valid API key.')).code, 'ai_key');
  assert.equal(aiFailure({ status: 404, message: 'models/gemini-x is not found' }).code, 'ai_model');
  const busy = aiFailure({ status: 429, message: 'RESOURCE_EXHAUSTED' });
  assert.equal(busy.code, 'ai_rate_limit'); assert.equal(busy.status, 429);
  assert.equal(aiFailure({ status: 400, message: 'bad' }).code, 'ai_request');
  assert.equal(aiFailure(new Error('socket hang up')).code, 'ai_error');
  assert.equal(aiFailure(undefined).code, 'ai_error');
});

test('only ChemQuest pages may call the AI functions from a browser', () => {
  for (const origin of ['https://pinequest-s5-episode-2-team-5.vercel.app', 'https://pinequest-s5-episode-2-team-5-123kenshi.vercel.app', 'https://pinequest-s5-episode-2-team-5-i3egqwt34-123kenshi.vercel.app', 'http://localhost:8081']) {
    assert.equal(allowedOrigin(origin), true, origin);
  }
  for (const origin of ['https://evil.example', 'https://pinequest-s5-episode-2-team-5.vercel.app.evil.example', 'https://other-project.vercel.app', null]) {
    assert.equal(allowedOrigin(origin), false, String(origin));
  }
  assert.equal(allowedOrigin('https://chemquest.mn', 'https://chemquest.mn, https://x.mn'), true);
  assert.equal(corsHeaders('https://evil.example')['Access-Control-Allow-Origin'], undefined);
  assert.equal(corsHeaders('http://localhost:8081')['Access-Control-Allow-Origin'], 'http://localhost:8081');
});

test('the tutor keeps the current experiment and adds the lessons that match the question', () => {
  const filler = 'x'.repeat(3000);
  const experiments = Array.from({ length: 60 }, (_, i) => ({ id: `e${i}`, title: `Туршилт ${i}`, steps: [filler] }));
  experiments.push({ id: 'cat', title: 'Катализаторын нөлөө', steps: ['устөрөгчийн хэт исэл задрах'] });
  const raw = JSON.stringify({ app: 'ChemQuest', lessons: [{ id: 'l1', title: 'Катализатор гэж юу вэ' }], experiments, currentExperiment: { id: 'e59', title: 'Одоогийн туршилт' }, completedSteps: { e59: ['s1'], e3: ['s9'] }, controls: 'E interact' });
  assert.ok(raw.length > 60000, 'the old 60 000 cut would have dropped the current experiment');
  const out = JSON.parse(compactContext(raw, 'Катализатор яаж ажилладаг вэ?'));
  assert.equal(out.currentExperiment.id, 'e59');
  assert.deepEqual(out.completedSteps, ['s1']);
  assert.equal(out.controls, 'E interact');
  const related = out.related.map((r) => r.id);
  assert.ok(related.includes('cat') && related.includes('l1'), 'matching lessons and experiments are included');
  assert.ok(!related.includes('e59'), 'the current experiment is not repeated');
  assert.ok(JSON.stringify(out).length <= 16000);
  assert.equal(compactContext('not json'.repeat(5000), 'q').length, 16000);
});

const pack = {
  topics: [
    { id: '1.1', title: 'Бодис', notes: [{ id: 'n1' }, { id: 'n2' }], flashcards: [{ id: 'c1' }], quiz: [{ id: 'q1', question: 'H_2O-ийн **томьёо**' }, { id: 'q2', question: 'b' }], questions: [{ id: 's1', totalMarks: 4 }], practicals: [], objectives: [{ id: 'o1', text: 'Бодисыг ангилах' }] },
    { id: '1.2', title: 'Холимог', notes: [{ id: 'n3' }], flashcards: [], quiz: [{ id: 'q3', question: 'c' }], questions: [], practicals: [{ id: 'p1', title: 'Шүүх' }], objectives: [] },
    { id: '1.3', title: 'Урвал', notes: [{ id: 'n4' }], flashcards: [], quiz: [], questions: [], practicals: [], objectives: [] },
    { bad: true },
  ],
};

test('a new student is pointed at the first topics; a working one at the topics giving trouble', () => {
  const topics = packTopics(pack);
  assert.equal(topics.length, 3, 'malformed topics are dropped');
  const fresh = pickTopics(topics, restoreProgress(null));
  assert.deepEqual(fresh.map((f) => [f.topicId, f.tab, f.started]), [['1.1', 'notes', false], ['1.2', 'notes', false], ['1.3', 'notes', false]]);
  const progress = restoreProgress({ notes: ['n1', 'n2', 'n3', 'n4'], wrong: ['q1'], ratings: { o1: 'red' }, quizBest: { '1.2': 90 }, cards: { c1: 'known' }, practicals: ['p1'], questionBest: { s1: 'x' } });
  const facts = pickTopics(topics, progress);
  assert.equal(facts[0].topicId, '1.1', 'a red objective and a wrong answer come first');
  assert.equal(facts[0].tab, 'notes');
  assert.deepEqual(facts[0].wrong, ['H2O-ийн томьёо']);
  assert.deepEqual(facts[0].red, ['Бодисыг ангилах']);
  assert.ok(!facts.some((f) => f.topicId === '1.2'), 'a finished topic is not suggested');
});

test('AI wording is used only for the picked topics, with the template for anything missing', () => {
  const facts = pickTopics(packTopics(pack), restoreProgress(null));
  const template = templateAdvice(facts);
  assert.match(template[0].why, /хараахан эхлээгүй/);
  assert.match(template[0].action, /0\/2/);
  const reply = 'Энд байна:\n[{"topicId":"1.1","title":"Бодисоос эхэл","why":"Шинэ сэдэв","action":"Тэмдэглэлээ унш"},{"topicId":"9.9","title":"x","why":"y","action":"z"},{"topicId":"1.2","title":""}]';
  const advice = parseAdvice(reply, facts);
  assert.equal(advice.length, 3);
  assert.deepEqual(advice[0], { topicId: '1.1', tab: 'notes', title: 'Бодисоос эхэл', why: 'Шинэ сэдэв', action: 'Тэмдэглэлээ унш' });
  assert.deepEqual(advice[1], template[1], 'an incomplete item keeps the template');
  assert.equal(parseAdvice('sorry, no JSON', facts), null);
  assert.equal(parseAdvice('[{"topicId":"9.9","title":"a","why":"b","action":"c"}]', facts), null, 'nothing usable is not used');
  assert.equal(factsHash(facts), factsHash(structuredClone(facts)));
  assert.notEqual(factsHash(facts), factsHash(facts.slice(1)));
});
