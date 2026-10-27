import { randomBytes } from 'crypto';
import { CATS, LEVELS } from './categories';
import { CatId, ChoiceQ, Level, Question, TextQ } from './types';

/** Categories that new multiple-choice questions can use: those the test composition draws MCQs from. */
export const MCQ_CATS = [...new Set(Object.values(LEVELS).flatMap((l) => Object.keys(l.mcq)))] as CatId[];

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strList = (v: unknown, maxItems: number, maxLen: number) =>
  (Array.isArray(v) ? v : []).map((x) => str(x, maxLen)).filter(Boolean).slice(0, maxItems);

export const newId = () => `C_${randomBytes(5).toString('hex')}`;

/** Validates and normalises untrusted question JSON. Returns the clean question or an error message. */
export function normalizeQuestion(raw: unknown): { q: Question } | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'Not an object' };
  const r = raw as Record<string, unknown>;

  const id = str(r.id, 40) || newId();
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) return { error: 'id may only contain letters, digits, _ and - (max 40)' };
  const cat = r.cat as CatId;
  if (typeof cat !== 'string' || !(cat in CATS)) return { error: `Unknown category "${String(r.cat)}"` };
  const d = Number(r.d);
  if (d !== 1 && d !== 2 && d !== 3) return { error: 'Difficulty must be 1, 2 or 3' };
  const q = str(r.q, 4000);
  if (!q) return { error: 'Question text is required' };
  const code = str(r.code, 8000) || undefined;
  const type = r.type;
  const base = { id, cat, d: d as 1 | 2 | 3, q, code };

  if (type === 'mcq' || type === 'multi') {
    if (!MCQ_CATS.includes(cat)) return { error: `Multiple-choice questions cannot use "${cat}" (it is not drawn for MCQs). Use one of: ${MCQ_CATS.join(', ')}` };
    const opts = strList(r.opts, 8, 500);
    if (opts.length < 2) return { error: 'At least 2 options are required' };
    const ans = [...new Set((Array.isArray(r.ans) ? r.ans : []).map(Number))]
      .filter((i) => Number.isInteger(i) && i >= 0 && i < opts.length).sort((a, b) => a - b);
    if (type === 'mcq' && ans.length !== 1) return { error: 'Single-answer questions need exactly one correct option' };
    if (type === 'multi' && (ans.length < 1 || ans.length >= opts.length)) return { error: 'Multi-select needs at least one correct option, and not all of them' };
    const why = str(r.why, 3000);
    if (!why) return { error: 'An explanation ("why") is required - interviewers see it in the review' };
    const out: ChoiceQ = { ...base, type, opts, ans, why };
    return { q: out };
  }

  if (type === 'text' || type === 'code') {
    const lookFor = strList(r.lookFor, 12, 500);
    if (lookFor.length === 0) return { error: 'List at least one thing a strong answer covers' };
    const rubric = (Array.isArray(r.rubric) ? r.rubric : [])
      .map((g) => strList(g, 20, 80)).filter((g) => g.length > 0).slice(0, 12);
    const out: TextQ = { ...base, type, lookFor, rubric, starter: str(r.starter, 4000) || undefined };
    if (cat !== 'handson') {
      const levels = (Array.isArray(r.levels) ? r.levels : []).filter((l): l is Level => typeof l === 'string' && l in LEVELS);
      out.levels = [...new Set(levels)];
    }
    return { q: out };
  }
  return { error: 'type must be one of mcq, multi, text, code' };
}
