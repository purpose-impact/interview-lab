import { CatId, ChoiceQ, TextQ } from '../types';

/** single-answer MCQ */
export const mc = (
  id: string, cat: CatId, d: 1 | 2 | 3, q: string, opts: string[], ans: number, why: string, code?: string,
): ChoiceQ => ({ id, cat, d, type: 'mcq', q, opts, ans: [ans], why, code });

/** multi-select (partial credit, wrong picks are penalised) */
export const ms = (
  id: string, cat: CatId, d: 1 | 2 | 3, q: string, opts: string[], ans: number[], why: string, code?: string,
): ChoiceQ => ({ id, cat, d, type: 'multi', q, opts, ans, why, code });

export const tx = (
  id: string, cat: CatId, d: 1 | 2 | 3, q: string, lookFor: string[], rubric: string[][],
  extra: { code?: string; starter?: string; type?: 'text' | 'code' } = {},
): TextQ => ({ id, cat, d, type: extra.type ?? 'text', q, lookFor, rubric, code: extra.code, starter: extra.starter });
