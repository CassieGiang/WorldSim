// Asking a local LLM (Ollama, e.g. Qwen) what a state's government decides.
export const FOCI = ['science', 'farming', 'army', 'expansion', 'stability', 'trade'];

const SYSTEM = `You are the ruling council of a state in a simulated world history. You speak as that government, in character for its culture and era, but you decide like a shrewd strategist.
Every few decades you choose ONE priority for the coming period:
- science: fund scholars and inventors (faster research)
- farming: clear new farmland, build granaries, move food to hungry provinces
- army: raise and train soldiers (stronger in war)
- expansion: push borders into unclaimed land
- stability: keep order, calm provinces that want to break away, avoid new wars
- trade: move goods and food, share ideas with neighbours
You may also declare war on ONE neighbour (use its exact name) or make peace with enemies (exact names). War is costly; only start one with a reason. Attacking a state under truce is dishonourable. You may propose an alliance to ONE state (it may refuse) or leave your alliance; allies are called into each other's defensive wars.
Reply with JSON only, with these fields in this order:
- reasoning: your private analysis, at most 2 sentences. Numbers are fine here.
- focus, war_target, peace_with: your decision.
- statement: the proclamation your ruler reads out to the people. ONE sentence, at most 25 words, in the voice of your ruler, culture and era. Never mention percentages, statistics, "stability", "technologies" or anything that sounds like a game; speak of harvests, borders, gods, ancestors, enemies, scholars.`;

export function councilSchema(neighbours, enemies, allyCands = [], inAlliance = false) {
  return {
    type: 'object',
    properties: {
      reasoning: { type: 'string', description: 'Private analysis, max 2 sentences.' },
      focus: { type: 'string', enum: FOCI },
      war_target: { anyOf: [{ type: 'string', enum: neighbours.length ? neighbours : ['none'] }, { type: 'null' }] },
      peace_with: { type: 'array', items: { type: 'string', enum: enemies.length ? enemies : ['none'] } },
      alliance_with: { anyOf: [{ type: 'string', enum: allyCands.length ? allyCands : ['none'] }, { type: 'null' }] },
      leave_alliance: { type: 'boolean' },
      statement: { type: 'string', description: 'One in-character proclamation, max 25 words, no numbers or game terms.' },
    },
    required: ['reasoning', 'focus', 'war_target', 'peace_with', 'alliance_with', 'leave_alliance', 'statement'],
  };
}

export async function askCouncil({ url, model, brief, neighbours, enemies, allyCands = [], inAlliance = false, ruler = '', every, signal }) {
  const body = {
    model, stream: false,
    format: councilSchema(neighbours, enemies, allyCands, inAlliance),
    options: { temperature: 0.8 },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `${brief}\n\nNeighbours you could attack: ${neighbours.join(', ') || 'none'}.\nCurrent enemies: ${enemies.join(', ') || 'none'}.\nPossible allies: ${allyCands.join(', ') || 'none'}.${inAlliance ? '' : ' You are in no alliance.'}\n${ruler ? `You speak for ${ruler}.\n` : ''}Decide your priority for the next ${every} years.` },
    ],
  };
  if (/qwen3/i.test(model)) body.think = false;
  const r = await fetch(url.replace(/\/$/, '') + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  if (!r.ok) throw new Error(`Ollama answered ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  let txt = (j.message && j.message.content) || '';
  txt = txt.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const m = txt.match(/\{[\s\S]*\}/);
  const d = JSON.parse(m ? m[0] : txt);
  if (d.war_target === 'none') d.war_target = null;
  if (d.alliance_with === 'none') d.alliance_with = null;
  d.peace_with = (d.peace_with || []).filter(n => n !== 'none');
  d.statement = tidy(d.statement, 220);
  d.reasoning = tidy(d.reasoning, 320);
  return d;
}

export async function listModels(url) {
  const r = await fetch(url.replace(/\/$/, '') + '/api/tags');
  if (!r.ok) throw new Error('status ' + r.status);
  const j = await r.json();
  return (j.models || []).map(m => m.name);
}

// shorten at a sentence (or word) boundary instead of mid-word
function tidy(t, max) {
  if (typeof t !== 'string') return '';
  t = t.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return end > max * 0.25 ? cut.slice(0, end + 1) : cut.slice(0, cut.lastIndexOf(' ')) + '…';
}

// a short narrative of one family's history, written by the local model
export async function writeFamilyStory({ url, model, surname, record, signal }) {
  const body = {
    model, stream: false, options: { temperature: 0.9 },
    messages: [
      { role: 'system', content: 'You are a historian-storyteller. Turn a family chronicle from a simulated world history into vivid, plain prose: 3 short paragraphs, about 220 words, past tense. Keep every fact (names, years, places, causes of death); invent only small human details (smells, objects, feelings). No headings, no lists.' },
      { role: 'user', content: `The ${surname} family, as recorded:\n${record}` },
    ],
  };
  if (/qwen3/i.test(model)) body.think = false;
  const r = await fetch(url.replace(/\/$/, '') + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  if (!r.ok) throw new Error(`Ollama answered ${r.status}`);
  const j = await r.json();
  return ((j.message && j.message.content) || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

// one chapter of the history book: a century written from the chronicle
export async function writeChapter({ url, model, title, record, before, signal }) {
  const body = {
    model, stream: false, options: { temperature: 0.7 },
    messages: [
      { role: 'system', content: 'You are a historian writing a readable history book about an alternate world. Write one chapter from the chronicle you are given: 3 to 4 paragraphs, about 300 words, past tense, plain English. Keep every name, year and number exactly as given and invent no events; you may explain causes and links between events that the record shows. Do not mention our real world unless the record does. No headings, no lists.' },
      { role: 'user', content: `${before ? `Where the previous chapter ended: ${before}\n\n` : ''}Chapter: ${title}\nChronicle:\n${record}` },
    ],
  };
  if (/qwen3/i.test(model)) body.think = false;
  const r = await fetch(url.replace(/\/$/, '') + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  if (!r.ok) throw new Error(`Ollama answered ${r.status}`);
  const j = await r.json();
  return ((j.message && j.message.content) || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

// a letter from one ruler to another, in the sender's voice, from a short gist
export async function writeLetter({ url, model, from, to, gist, mood, signal }) {
  const body = {
    model, stream: false, options: { temperature: 0.8 },
    messages: [
      { role: 'system', content: 'You write letters between rulers in an alternate world. Write one letter of 80 to 140 words in the voice of the sender, fitting their era and culture, saying what the gist says and nothing more. Keep every name exactly as given. No headings; end with the sender\'s name.' },
      { role: 'user', content: `From: ${from}\nTo: ${to}\nMood: ${mood}\nGist: ${gist}` },
    ],
  };
  if (/qwen3/i.test(model)) body.think = false;
  const r = await fetch(url.replace(/\/$/, '') + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  if (!r.ok) throw new Error(`Ollama answered ${r.status}`);
  const j = await r.json();
  return ((j.message && j.message.content) || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

// one or two sentences of live commentary on a turning point, like a documentary narrator
export async function writeComment({ url, model, event, context, signal }) {
  const body = {
    model, stream: false, options: { temperature: 0.8, num_predict: 90 },
    messages: [
      { role: 'system', content: 'You are the narrator of a documentary about an alternate history. Comment on the event in one or two short sentences (under 40 words): why it matters or what it may lead to. Keep names exactly as given. Do not invent events.' },
      { role: 'user', content: `Event: ${event}\nContext: ${context}` },
    ],
  };
  if (/qwen3/i.test(model)) body.think = false;
  const r = await fetch(url.replace(/\/$/, '') + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  if (!r.ok) throw new Error(`Ollama answered ${r.status}`);
  const j = await r.json();
  return ((j.message && j.message.content) || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}
