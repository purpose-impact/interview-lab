import Link from 'next/link';
import { isAdmin } from '@/lib/auth';
import { loadBank } from '@/lib/bank';
import { storageMode } from '@/lib/store';
import { CAT_ORDER, CATS, LEVELS } from '@/lib/categories';
import { MCQ_CATS } from '@/lib/qvalidate';
import { Level, isChoice } from '@/lib/types';
import { AdminShell } from '../ui';
import QuestionsAdmin, { Row } from './QuestionsAdmin';

export const dynamic = 'force-dynamic';

const ALLOWED: Record<Level, number[]> = { mid: [1, 2], senior: [2, 3], lead: [2, 3] };

export default async function QuestionsPage() {
  if (!isAdmin()) return <main className="wrap narrow"><div className="panel"><p>Please <Link href="/admin">sign in</Link> first.</p></div></main>;
  const bank = await loadBank();

  const rows: Row[] = Object.values(bank.byId).map((q) => ({
    q,
    source: !bank.builtinIds.has(q.id) ? 'added' : bank.overlay.custom[q.id] ? 'edited' : 'built-in',
    retired: bank.retired.has(q.id),
  }));
  const active = rows.filter((r) => !r.retired).map((r) => r.q);

  // pyramid: active questions per category and difficulty, and whether each level's paper can be filled
  const pyramid = CAT_ORDER.map((c) => {
    const qs = active.filter((q) => q.cat === c);
    const byD = [1, 2, 3].map((d) => qs.filter((q) => q.d === d).length);
    const coverage = (Object.keys(LEVELS) as Level[]).map((l) => {
      const need = LEVELS[l].mcq[c] ?? 0;
      const have = bank.mcq.filter((q) => q.cat === c && ALLOWED[l].includes(q.d)).length;
      return { l, need, have };
    });
    return { c, total: qs.length, byD, coverage };
  });

  return (
    <AdminShell active="questions">
      <h1>Question bank</h1>
      <p className="muted">
        Each question belongs to a skill area (category). A candidate&apos;s score in an area is built from the questions drawn from it, and the areas roll up into the overall
        score using the weights below. Difficulty decides the level: <b>Foundation</b> questions are drawn for Mid, <b>Senior</b> for all levels, <b>Lead</b> for Senior and Lead.
        Changes apply to <b>new</b> tests; existing attempts keep their questions.
      </p>
      {storageMode === 'memory' && (
        <p className="panel err" role="alert">Storage is in-memory (no Redis configured), so question changes are lost when the server restarts. Configure Upstash Redis for durable edits.</p>
      )}

      <div className="panel">
        <h2>Coverage by skill area</h2>
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th>Area</th><th>Weight</th><th>Foundation</th><th>Senior</th><th>Lead</th><th>Total</th>
                {(Object.keys(LEVELS) as Level[]).map((l) => <th key={l} title="MCQs available / MCQs drawn per paper">{LEVELS[l].label.split(' ')[0]} MCQ pool</th>)}</tr>
            </thead>
            <tbody>
              {pyramid.map((p) => (
                <tr key={p.c}>
                  <td title={CATS[p.c].label}><b>{CATS[p.c].short}</b></td>
                  <td>{CATS[p.c].weight}</td>
                  {p.byD.map((n, i) => <td key={i}>{n}</td>)}
                  <td><b>{p.total}</b></td>
                  {p.coverage.map((x) => (
                    <td key={x.l} className={x.need === 0 ? 'muted' : x.have < x.need ? 'err' : ''}>
                      {x.need === 0 ? '-' : `${x.have} / ${x.need}${x.have < x.need ? ' ⚠' : ''}`}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">⚠ means fewer eligible questions than a paper draws, so the test tops up from other difficulties. Weights are set in <code>src/lib/categories.ts</code>.</p>
      </div>

      <QuestionsAdmin
        rows={rows}
        mcqCats={MCQ_CATS}
        cats={CAT_ORDER.map((c) => ({ id: c, label: CATS[c].label }))}
        levels={(Object.keys(LEVELS) as Level[]).map((l) => ({ id: l, label: LEVELS[l].label }))}
        choiceCount={active.filter(isChoice).length}
      />
    </AdminShell>
  );
}
