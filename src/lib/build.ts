import { CatId, Level, PublicQuestion, Question, isChoice } from './types';
import { LEVELS } from './categories';
import { Bank } from './bank';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Eligible difficulty and ordering preference per level. */
function pick(pool: Question[], level: Level, n: number): Question[] {
  const allowed = level === 'mid' ? [1, 2] : [2, 3];
  let p = shuffle(pool.filter((q) => allowed.includes(q.d)));
  if (level === 'lead') p = p.sort((a, b) => b.d - a.d); // stable: harder first, random within
  if (level === 'mid') p = p.sort((a, b) => a.d - b.d);
  if (p.length < n) {
    // top up from the rest of the pool so a test is never short
    const rest = shuffle(pool.filter((q) => !p.includes(q)));
    p = [...p, ...rest];
  }
  return p.slice(0, n);
}

/** Returns the ordered list of question ids for a new attempt. */
export function buildPaper(level: Level, bank: Bank): string[] {
  const cfg = LEVELS[level];
  const ids: string[] = [];

  (Object.keys(cfg.mcq) as CatId[]).forEach((cat) => {
    const pool = bank.mcq.filter((q) => q.cat === cat);
    ids.push(...pick(pool, level, cfg.mcq[cat] ?? 0).map((q) => q.id));
  });
  // shuffle MCQs so categories are interleaved
  const mcqs = shuffle(ids);

  const hands = pick(bank.hands, level, cfg.hands).map((q) => q.id);

  // fixed/random-of-group written questions; retired or missing ids are skipped
  const usable = (id: string) => !!bank.byId[id] && !bank.retired.has(id);
  const written: string[] = [];
  for (const w of cfg.written) {
    const options = (Array.isArray(w) ? w : [w]).filter(usable);
    if (options.length) written.push(options[Math.floor(Math.random() * options.length)]);
  }
  const extra = bank.extraWritten.filter((q) => q.levels?.includes(level) && !written.includes(q.id)).map((q) => q.id);
  return [...mcqs, ...written, ...extra, ...hands];
}

/** Random option order for every choice question in the paper. */
export function buildPerms(qids: string[], bank: Bank): Record<string, number[]> {
  const perm: Record<string, number[]> = {};
  for (const id of qids) {
    const q = bank.byId[id];
    if (q && isChoice(q)) perm[id] = shuffle(q.opts.map((_, i) => i));
  }
  return perm;
}

export function toPublic(q: Question, perm?: number[]): PublicQuestion {
  if (isChoice(q)) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ans, why, ...rest } = q;
    return perm ? { ...rest, opts: perm.map((i) => q.opts[i]) } : rest;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { lookFor, rubric, ...rest } = q;
  return rest;
}
