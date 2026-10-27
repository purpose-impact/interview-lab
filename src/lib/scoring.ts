import { Attempt, CatId, ChoiceQ, TextQ, isChoice } from './types';
import { CATS, CAT_ORDER, LIVE_DIMENSIONS } from './categories';
import { Bank } from './bank';

/** Candidate answers are stored as DISPLAY indices; map back to original option indices. */
export function toOriginal(given: unknown, perm?: number[]): number[] {
  const g = Array.isArray(given) ? (given as number[]) : [];
  return perm ? g.filter((i) => Number.isInteger(i) && i >= 0 && i < perm.length).map((i) => perm[i]) : g;
}

export function gradeChoice(q: ChoiceQ, given: unknown, perm?: number[]): number {
  const g = toOriginal(given, perm);
  if (g.length === 0) return 0;
  if (q.type === 'mcq') return g.length === 1 && g[0] === q.ans[0] ? 1 : 0;
  const correct = g.filter((x) => q.ans.includes(x)).length;
  const wrong = g.filter((x) => !q.ans.includes(x)).length;
  return Math.max(0, (correct - wrong) / q.ans.length);
}

/** Keyword-coverage suggestion 0..5 (rounded to 0.5). The interviewer's score always wins. */
export function suggestText(q: TextQ, text: unknown): number {
  const t = (typeof text === 'string' ? text : '').toLowerCase();
  const words = t.trim().split(/\s+/).filter(Boolean).length;
  if (words < 5 || q.rubric.length === 0) return 0;
  const hit = q.rubric.filter((group) => group.some((k) => t.includes(k.toLowerCase()))).length;
  let s = (hit / q.rubric.length) * 5;
  if (words < 25) s = Math.min(s, 1.5);
  else if (words < 60) s = Math.min(s, 3.5);
  return Math.round(s * 2) / 2;
}

export interface ItemResult {
  id: string;
  cat: CatId;
  kind: 'choice' | 'text';
  frac: number; // 0..1
  weight: number;
  pending: boolean; // text answer not yet scored by a human
  suggested?: number;
  final?: number;
}
export interface CatResult { cat: CatId; pct: number | null; items: number; pending: number }
export interface Evaluation {
  items: ItemResult[];
  cats: Record<CatId, CatResult>;
  overall: number | null;
  pendingCount: number;
  recommendation: string;
  objective: { correct: number; total: number; pct: number | null };
}

const TEXT_WEIGHT = 3;
const LIVE_WEIGHT = 2;

export function recommend(overall: number | null): string {
  if (overall === null) return 'Not scored';
  if (overall >= 78) return 'Strong hire';
  if (overall >= 65) return 'Hire';
  if (overall >= 50) return 'Borderline';
  return 'No hire';
}

export function evaluate(a: Attempt, bank: Bank): Evaluation {
  const items: ItemResult[] = [];
  let correct = 0;
  let total = 0;

  for (const id of a.qids) {
    const q = bank.byId[id];
    if (!q) continue;
    if (isChoice(q)) {
      const frac = gradeChoice(q, a.answers[id], a.perm?.[id]);
      items.push({ id, cat: q.cat, kind: 'choice', frac, weight: 1, pending: false });
      total += 1;
      correct += frac;
    } else {
      const suggested = suggestText(q, a.answers[id]);
      const manual = a.review.scores[id];
      const answered = typeof a.answers[id] === 'string' && (a.answers[id] as string).trim().length > 0;
      const final = manual !== undefined ? manual : suggested;
      items.push({
        id, cat: q.cat, kind: 'text', frac: final / 5, weight: TEXT_WEIGHT,
        pending: manual === undefined && answered, suggested, final,
      });
    }
  }
  // live interview ratings feed the "project" category
  for (const d of LIVE_DIMENSIONS) {
    const v = a.review.live[d.id];
    if (v !== undefined) items.push({ id: `live:${d.id}`, cat: 'project', kind: 'text', frac: v / 5, weight: LIVE_WEIGHT, pending: false, final: v });
  }

  const cats = {} as Record<CatId, CatResult>;
  for (const c of CAT_ORDER) {
    const its = items.filter((i) => i.cat === c);
    const w = its.reduce((s, i) => s + i.weight, 0);
    cats[c] = {
      cat: c,
      pct: w > 0 ? (its.reduce((s, i) => s + i.weight * i.frac, 0) / w) * 100 : null,
      items: its.length,
      pending: its.filter((i) => i.pending).length,
    };
  }
  const scored = CAT_ORDER.filter((c) => cats[c].pct !== null);
  const wsum = scored.reduce((s, c) => s + CATS[c].weight, 0);
  const overall = wsum > 0 ? scored.reduce((s, c) => s + CATS[c].weight * (cats[c].pct as number), 0) / wsum : null;
  return {
    items, cats, overall,
    pendingCount: items.filter((i) => i.pending).length,
    recommendation: recommend(overall),
    objective: { correct, total, pct: total ? (correct / total) * 100 : null },
  };
}
