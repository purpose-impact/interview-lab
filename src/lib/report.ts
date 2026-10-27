import { Attempt, TextQ, isChoice } from './types';
import { CAT_ORDER, CATS, DECISIONS, LEVELS, LIVE_DIMENSIONS } from './categories';
import { Bank } from './bank';
import { Evaluation, aggregate, evaluate } from './scoring';

export interface AreaRow { id: string; label: string; short: string; pct: number | null }
export interface TextRow { area: string; question: string; answer: string; score: number | null; scoredBy: 'interviewer' | 'suggested'; note: string; lookFor: string[] }
export interface AttemptReport {
  id: string; level: string; started: string; submitted: string | null; minutes: number | null; limit: number;
  overall: number | null; recommendation: string; decision: string; reviewer: string; pending: number;
  objective: { correct: number; total: number; pct: number | null };
  areas: AreaRow[]; text: TextRow[]; live: { label: string; value: number }[]; liveNotes: string;
  flags: { blur: number; paste: number };
}
export interface Report {
  name: string; email: string; generatedAt: string;
  /** present when more than one submitted test is combined */
  combined: { tests: number; overall: number | null; recommendation: string; objective: AttemptReport['objective']; areas: AreaRow[]; pending: number } | null;
  attempts: AttemptReport[];
}

const areas = (e: Evaluation): AreaRow[] => CAT_ORDER.map((c) => ({ id: c, label: CATS[c].label, short: CATS[c].short, pct: e.cats[c].pct }));

function attemptReport(a: Attempt, e: Evaluation, bank: Bank): AttemptReport {
  const text: TextRow[] = [];
  for (const id of a.qids) {
    const q = bank.byId[id];
    if (!q || isChoice(q)) continue;
    const t = q as TextQ;
    const manual = a.review.scores[id];
    const item = e.items.find((i) => i.id === id);
    const answer = typeof a.answers[id] === 'string' ? (a.answers[id] as string) : '';
    text.push({
      area: CATS[q.cat].short, question: q.q, answer,
      score: manual ?? (answer.trim() ? item?.suggested ?? null : null),
      scoredBy: manual !== undefined ? 'interviewer' : 'suggested',
      note: a.review.notes[id] ?? '', lookFor: t.lookFor,
    });
  }
  return {
    id: a.id, level: LEVELS[a.level].label, started: a.createdAt, submitted: a.submittedAt ?? null,
    minutes: a.submittedAt ? Math.round((new Date(a.submittedAt).getTime() - new Date(a.createdAt).getTime()) / 60000) : null,
    limit: LEVELS[a.level].minutes,
    overall: e.overall, recommendation: a.submittedAt ? e.recommendation : 'In progress',
    decision: a.review.decision ? DECISIONS[a.review.decision] : '', reviewer: a.review.reviewer ?? '', pending: e.pendingCount,
    objective: e.objective, areas: areas(e), text,
    live: LIVE_DIMENSIONS.filter((d) => a.review.live[d.id] !== undefined).map((d) => ({ label: d.label, value: a.review.live[d.id] })),
    liveNotes: a.review.liveNotes ?? '', flags: a.flags,
  };
}

/** Builds a feedback summary for one candidate: every test, plus the combined profile when 2+ tests are submitted. */
export function buildReport(attempts: Attempt[], bank: Bank): Report {
  const sorted = [...attempts].sort((x, y) => x.createdAt.localeCompare(y.createdAt));
  const evals = sorted.map((a) => evaluate(a, bank));
  const done = evals.filter((_, i) => sorted[i].submittedAt);
  const latest = sorted[sorted.length - 1];
  let combined: Report['combined'] = null;
  if (done.length > 1) {
    const g = aggregate(done);
    combined = { tests: done.length, overall: g.overall, recommendation: g.recommendation, objective: g.objective, areas: areas(g), pending: g.pendingCount };
  }
  return {
    name: latest.name, email: latest.email, generatedAt: new Date().toISOString(),
    combined, attempts: sorted.map((a, i) => attemptReport(a, evals[i], bank)),
  };
}

const pct = (v: number | null) => (v === null ? '-' : `${v.toFixed(0)}%`);
const d16 = (iso: string | null) => (iso ? iso.slice(0, 16).replace('T', ' ') + ' UTC' : '-');
const quote = (t: string) => t.trim().split('\n').map((l) => `> ${l}`).join('\n');

export function reportToMarkdown(r: Report): string {
  const o: string[] = [];
  o.push(`# Interview feedback summary - ${r.name}`, '', `${r.email} · generated ${d16(r.generatedAt)}`, '');
  const areaTable = (rows: AreaRow[]) => ['| Skill area | Score |', '|---|---|', ...rows.filter((a) => a.pct !== null).map((a) => `| ${a.label} | ${pct(a.pct)} |`), ''];

  if (r.combined) {
    const c = r.combined;
    o.push(`## Combined profile (${c.tests} tests)`, '', `**Overall ${pct(c.overall)} - ${c.recommendation}**` + (c.pending ? ` (${c.pending} answer(s) not yet scored by an interviewer)` : ''),
      `Objective questions: ${c.objective.correct.toFixed(1)} / ${c.objective.total} (${pct(c.objective.pct)})`, '', ...areaTable(c.areas));
  }
  r.attempts.forEach((a, i) => {
    o.push(`## Test ${i + 1} of ${r.attempts.length} - ${a.level}`, '',
      `Started ${d16(a.started)} · ${a.submitted ? `submitted ${d16(a.submitted)} (${a.minutes} of ${a.limit} min)` : 'not submitted'}`, '',
      `**Overall ${pct(a.overall)} - ${a.recommendation}**` + (a.decision ? ` · Interviewer decision: **${a.decision}**` : '') + (a.reviewer ? ` (${a.reviewer})` : ''),
      `Objective questions: ${a.objective.correct.toFixed(1)} / ${a.objective.total} (${pct(a.objective.pct)}) · Integrity signals: ${a.flags.blur} tab switches, ${a.flags.paste} pastes`, '',
      ...areaTable(a.areas));
    if (a.live.length || a.liveNotes) {
      o.push('### Live interview', '', ...a.live.map((l) => `- ${l.label}: ${l.value}/5`), ...(a.liveNotes ? ['', a.liveNotes] : []), '');
    }
    if (a.text.length) {
      o.push('### Written and coding answers', '');
      a.text.forEach((t, n) => {
        o.push(`**${n + 1}. [${t.area}] ${t.question.trim()}**`, '',
          `Score: ${t.score === null ? 'not answered' : `${t.score}/5 (${t.scoredBy === 'interviewer' ? 'interviewer' : 'automatic suggestion, not yet reviewed'})`}`,
          ...(t.note ? [`Interviewer note: ${t.note}`] : []), '', t.answer.trim() ? quote(t.answer) : '> (no answer)', '');
      });
    }
  });
  return o.join('\n');
}

export const reportFileName = (r: Report, ext: string) =>
  `feedback-${r.name.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'candidate'}.${ext}`;
