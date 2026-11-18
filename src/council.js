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
You may also declare war on ONE neighbour (use its exact name) or make peace with enemies (exact names). War is costly; only start one with a reason.
Reply with JSON only, with these fields in this order:
- reasoning: your private analysis, at most 2 sentences. Numbers are fine here.
- focus, war_target, peace_with: your decision.
- statement: the proclamation read out to your people. ONE sentence, at most 25 words, in the voice of your culture and era. Never mention percentages, statistics, "stability", "technologies" or anything that sounds like a game; speak of harvests, borders, gods, ancestors, enemies, scholars.`;

export function councilSchema(neighbours, enemies) {
  return {
    type: 'object',
    properties: {
      reasoning: { type: 'string', description: 'Private analysis, max 2 sentences.' },
      focus: { type: 'string', enum: FOCI },
      war_target: { anyOf: [{ type: 'string', enum: neighbours.length ? neighbours : ['none'] }, { type: 'null' }] },
      peace_with: { type: 'array', items: { type: 'string', enum: enemies.length ? enemies : ['none'] } },
      statement: { type: 'string', description: 'One in-character proclamation, max 25 words, no numbers or game terms.' },
    },
    required: ['reasoning', 'focus', 'war_target', 'peace_with', 'statement'],
  };
}

export async function askCouncil({ url, model, brief, neighbours, enemies, every, signal }) {
  const body = {
    model, stream: false,
    format: councilSchema(neighbours, enemies),
    options: { temperature: 0.8 },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `${brief}\n\nNeighbours you could attack: ${neighbours.join(', ') || 'none'}.\nCurrent enemies: ${enemies.join(', ') || 'none'}.\nDecide your priority for the next ${every} years.` },
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
