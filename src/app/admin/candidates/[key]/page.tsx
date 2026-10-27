import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { listAttempts } from '@/lib/store';
import { loadBank } from '@/lib/bank';
import { aggregate, evaluate } from '@/lib/scoring';
import { candidateKey, groupCandidates } from '@/lib/candidates';
import { CAT_ORDER, CATS, LEVELS } from '@/lib/categories';
import { AdminShell, Bar, fmtDate, recBadge } from '../../ui';
import Radar from '../../Radar';

export const dynamic = 'force-dynamic';

const pc = (v: number | null) => (v === null ? '-' : `${v.toFixed(0)}%`);

export default async function CandidatePage({ params }: { params: { key: string } }) {
  if (!isAdmin()) return <main className="wrap narrow"><div className="panel"><p>Please <Link href="/admin">sign in</Link> first.</p></div></main>;
  const key = candidateKey(decodeURIComponent(params.key));
  const [all, bank] = await Promise.all([listAttempts(), loadBank()]);
  const g = groupCandidates(all).find((x) => x.key === key);
  if (!g) notFound();

  const tests = g.attempts.map((a) => ({ a, e: evaluate(a, bank) }));
  const done = tests.filter((t) => t.a.submittedAt);
  const agg = done.length ? aggregate(done.map((t) => t.e)) : null;
  const scored = agg ? CAT_ORDER.filter((c) => agg.cats[c].pct !== null) : [];
  const enc = encodeURIComponent(g.key);

  return (
    <AdminShell active="candidates">
      <p className="small"><Link href="/admin/candidates">← All candidates</Link></p>
      <div className="panel">
        <div className="row between">
          <div>
            <h1 style={{ marginBottom: 2 }}>{g.name}</h1>
            <div className="muted">{g.email}</div>
            <div className="muted small">{done.length} submitted test{done.length === 1 ? '' : 's'}{tests.length > done.length ? ` · ${tests.length - done.length} in progress (not counted yet)` : ''}</div>
            <div className="row noprint" style={{ marginTop: 10 }}>
              <a className="btn primary" href={`/api/admin/report?candidate=${enc}`} download>Download feedback summary</a>
              <Link className="btn" href={`/admin/report?candidate=${enc}`}>Printable report / PDF</Link>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="muted small">Combined score</div>
            <div style={{ fontSize: '2.4rem', fontWeight: 700, lineHeight: 1 }}>{pc(agg?.overall ?? null)}</div>
            <div style={{ marginTop: 6 }}>{recBadge(agg ? agg.recommendation : 'No submitted tests')}</div>
            {agg && agg.pendingCount > 0 && <div className="small" style={{ color: 'var(--warn)', marginTop: 4 }}>{agg.pendingCount} answer(s) not yet scored by an interviewer</div>}
          </div>
        </div>
      </div>

      {agg && (
        <div className="two">
          <section className="panel">
            <h2>Combined skill profile</h2>
            <Radar labels={scored.map((c) => CATS[c].short)} values={scored.map((c) => agg.cats[c].pct)} />
          </section>
          <section className="panel">
            <h2>Score by area</h2>
            {CAT_ORDER.map((c) => (
              <div className="barrow" key={c}>
                <span title={CATS[c].label}>{CATS[c].short}</span>
                <Bar pct={agg.cats[c].pct} />
                <b>{pc(agg.cats[c].pct)}</b>
              </div>
            ))}
            <p className="muted small">Objective (auto-graded): {agg.objective.correct.toFixed(1)} / {agg.objective.total} ({pc(agg.objective.pct)}). Areas are pooled across all submitted tests, weighted by question.</p>
          </section>
        </div>
      )}

      <section className="panel">
        <h2>Area by test</h2>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Area</th>
                {tests.map(({ a }, i) => <th key={a.id} title={fmtDate(a.createdAt)}>Test {i + 1}<div className="muted small">{LEVELS[a.level].label.split(' (')[0]}</div></th>)}
                <th>Combined</th>
              </tr>
            </thead>
            <tbody>
              {CAT_ORDER.map((c) => (
                <tr key={c}>
                  <td title={CATS[c].label}>{CATS[c].short}</td>
                  {tests.map(({ a, e }) => <td key={a.id} className={a.submittedAt ? '' : 'muted'}>{pc(e.cats[c].pct)}</td>)}
                  <td><b>{pc(agg?.cats[c].pct ?? null)}</b></td>
                </tr>
              ))}
              <tr>
                <td><b>Overall</b></td>
                {tests.map(({ a, e }) => <td key={a.id} className={a.submittedAt ? '' : 'muted'}><b>{pc(e.overall)}</b></td>)}
                <td><b>{pc(agg?.overall ?? null)}</b></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="muted small">Grey columns are tests still in progress and are left out of the combined score.</p>
      </section>

      <section className="panel">
        <h2>All tests</h2>
        <div className="tablewrap">
          <table>
            <thead><tr><th>#</th><th>Level</th><th>Started</th><th>Status</th><th>Overall</th><th>Recommendation</th><th></th></tr></thead>
            <tbody>
              {tests.map(({ a, e }, i) => (
                <tr key={a.id}>
                  <td>{i + 1}</td>
                  <td>{LEVELS[a.level].label}</td>
                  <td className="small">{fmtDate(a.createdAt)}</td>
                  <td>{!a.submittedAt ? <span className="badge">In progress</span> : a.review.reviewedAt && e.pendingCount === 0 ? <span className="badge b-good">Reviewed</span> : <span className="badge b-warn">Needs review{e.pendingCount ? ` (${e.pendingCount})` : ''}</span>}</td>
                  <td>{pc(e.overall)}</td>
                  <td>{a.submittedAt ? recBadge(e.recommendation) : '-'}{a.review.decision && <div className="muted small">Decision: {a.review.decision.replace('_', ' ')}</div>}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className="row">
                      <Link className="btn" href={`/admin/candidate/${a.id}`}>Review</Link>
                      <a className="btn" href={`/api/admin/report?attempt=${a.id}`} download>Download</a>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
