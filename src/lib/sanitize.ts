import { Bank } from './bank';
import { Attempt, AnswerValue, isChoice } from './types';

export function sanitizeAnswers(a: Attempt, raw: unknown, bank: Bank): Record<string, AnswerValue> {
  const out: Record<string, AnswerValue> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!a.qids.includes(id)) continue;
    const q = bank.byId[id];
    if (!q) continue;
    if (isChoice(q)) {
      if (Array.isArray(v)) {
        const n = a.perm[id]?.length ?? q.opts.length;
        const picks = [...new Set(v.filter((x) => Number.isInteger(x) && x >= 0 && x < n))] as number[];
        out[id] = q.type === 'mcq' ? picks.slice(0, 1) : picks;
      }
    } else if (typeof v === 'string') {
      const t = v.slice(0, 10_000);
      out[id] = q.starter && t.trim() === q.starter.trim() ? '' : t;
    }
  }
  return out;
}

export function sanitizeFlags(a: Attempt, raw: unknown) {
  const f = (raw ?? {}) as { blur?: unknown; paste?: unknown };
  const n = (x: unknown, cur: number) => (typeof x === 'number' && x >= cur && x < 10_000 ? Math.floor(x) : cur);
  return { blur: n(f.blur, a.flags.blur), paste: n(f.paste, a.flags.paste) };
}

