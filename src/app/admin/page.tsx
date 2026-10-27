import Link from 'next/link';
import { isAdmin, adminConfigured } from '@/lib/auth';
import { listAttempts, storageMode } from '@/lib/store';
import { loadBank } from '@/lib/bank';
import { evaluate } from '@/lib/scoring';
import { CAT_ORDER, CATS, LEVELS } from '@/lib/categories';
import { Level } from '@/lib/types';
import { LoginForm } from './AdminBits';
import { AdminShell, Bar, fmtDate, pctClass, recBadge } from './ui';

export const dynamic = 'force-dynamic';

export default async function AdminHome({ searchParams }: { searchParams: { level?: string; sort?: string } }) {
  if (!adminConfigured()) {
    return <main className="wrap narrow"><div className="panel"><h2>Admin not configured</h2><p>Set the <code>ADMIN_PASSWORD</code> environment variable in Vercel (Project → Settings → Environment Variables) and redeploy.</p></div></main>;
  }
  if (!isAdmin()) return <main className="wrap narrow"><LoginForm /></main>;

  const all = await listAttempts();
  const bank = await loadBank();
  const levelFilter = (searchParams.level && searchParams.level in LEVELS ? searchParams.level : '') as Level | '';
  const sort = searchParams.sort === 'recent' ? 'recent' : 'score';
  const rows = all
    .filter((a) => !levelFilter || a.level === levelFilter)
    .map((a) => ({ a, e: evaluate(a, bank) }));
  rows.sort((x, y) => sort === 'recent' ? y.a.createdAt.localeCompare(x.a.createdAt)
    : (y.a.submittedAt ? 1 : 0) - (x.a.submittedAt ? 1 : 0) || (y.e.overall ?? -1) - (x.e.overall ?? -1));

  const submitted = rows.filter((r) => r.a.submittedAt);
  const avg = submitted.length ? submitted.reduce((s, r) => s + (r.e.overall ?? 0), 0) / submitted.length : null;
  const pending = submitted.filter((r) => r.e.pendingCount > 0 || !r.a.review.reviewedAt).length;
  const hires = submitted.filter((r) => ['Strong hire', 'Hire'].includes(r.e.recommendation)).length;

  const catAvg = CAT_ORDER.map((c) => {
    const vals = submitted.map((r) => r.e.cats[c].pct).filter((v): v is number => v !== null);
    return { c, pct: vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null };
  });
  const dist = ['Strong hire', 'Hire', 'Borderline', 'No hire'].map((k) => ({ k, n: submitted.filter((r) => r.e.recommendation === k).length }));

  return (
    <AdminShell active="dash">
      <div className="row between">
        <h1>Performance summary</h1>
        <form className="row noprint" method="get">
          <select name="level" defaultValue={levelFilter} style={{ width: 'auto' }} aria-label="Filter by level">
            <option value="">All levels</option>
            {Object.entries(LEVELS).map(([id, l]) => <option key={id} value={id}>{l.label}</option>)}
          </select>
          <select name="sort" defaultValue={sort} style={{ width: 'auto' }} aria-label="Sort">
            <option value="score">Sort: highest score</option><option value="recent">Sort: most recent</option>
          </select>
          <button>Apply</button>
        </form>
      </div>

      {storageMode === 'memory' && (
        <div className="panel" style={{ borderColor: 'var(--warn)' }}>
          <b>Temporary storage in use.</b> <span className="muted">No Redis database is connected, so results live in server memory and can disappear between requests on Vercel. Add Upstash Redis from the Vercel Marketplace (see README) before running real interviews.</span>
        </div>
      )}

      <div className="grid kpis" style={{ marginBottom: 16 }}>
        <div className="kpi"><b>{rows.length}</b><span>Candidates started</span></div>
        <div className="kpi"><b>{submitted.length}</b><span>Submitted</span></div>
        <div className="kpi"><b>{pending}</b><span>Awaiting your review</span></div>
        <div className="kpi"><b>{avg === null ? '-' : `${avg.toFixed(0)}%`}</b><span>Average overall score</span></div>
        <div className="kpi"><b>{hires}</b><span>Hire / Strong hire</span></div>
      </div>

      <div className="two">
        <section className="panel">
          <h2>Average by skill area</h2>
          {submitted.length === 0 ? <p className="muted">No submitted tests yet.</p> : catAvg.map(({ c, pct }) => (
            <div className="barrow" key={c}><span>{CATS[c].short}</span><Bar pct={pct} /><b>{pct === null ? '-' : `${pct.toFixed(0)}%`}</b></div>
          ))}
        </section>
        <section className="panel">
          <h2>Recommendation mix</h2>
          {dist.map((d) => (
            <div className="barrow" key={d.k}><span>{d.k}</span>
              <div className={`bar ${d.k === 'No hire' ? 'bad' : d.k === 'Borderline' ? 'warn' : 'good'}`} aria-hidden><i style={{ width: `${submitted.length ? (d.n / submitted.length) * 100 : 0}%` }} /></div>
              <b>{d.n}</b></div>
          ))}
          <p className="muted small" style={{ marginTop: 14 }}>
            Thresholds: ≥78% Strong hire · ≥65% Hire · ≥50% Borderline · below 50% No hire. The overall score is a weighted blend of the skill areas
            (weights: {CAT_ORDER.map((c) => `${CATS[c].short} ${CATS[c].weight}`).join(' · ')}). Treat it as a conversation aid, not the decision.
          </p>
        </section>
      </div>

      <section className="panel">
        <h2>Candidates</h2>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Candidate</th><th>Level</th><th>Status</th><th>Time</th><th>MCQ</th><th style={{ minWidth: 150 }}>Overall</th><th>Recommendation</th><th>Flags</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={8} className="muted">No candidates yet. Share the candidate link.</td></tr>}
              {rows.map(({ a, e }) => {
                const mins = a.submittedAt ? Math.round((new Date(a.submittedAt).getTime() - new Date(a.createdAt).getTime()) / 60000) : null;
                return (
                  <tr key={a.id}>
                    <td><Link href={`/admin/candidate/${a.id}`}><b>{a.name}</b></Link><div className="muted small">{a.email}</div></td>
                    <td>{LEVELS[a.level].label.split(' (')[0]}</td>
                    <td>{!a.submittedAt ? <span className="badge">In progress</span> : a.review.reviewedAt && e.pendingCount === 0 ? <span className="badge b-good">Reviewed</span> : <span className="badge b-warn">Needs review{e.pendingCount ? ` (${e.pendingCount})` : ''}</span>}
                      <div className="muted small">{fmtDate(a.createdAt)}</div></td>
                    <td>{mins === null ? '-' : `${mins} / ${LEVELS[a.level].minutes} min`}</td>
                    <td>{e.objective.pct === null ? '-' : `${e.objective.pct.toFixed(0)}%`}</td>
                    <td>{e.overall === null ? '-' : <div className="row" style={{ flexWrap: 'nowrap' }}><b style={{ width: 40 }}>{e.overall.toFixed(0)}%</b><div style={{ flex: 1, minWidth: 70 }}><div className={`bar ${pctClass(e.overall)}`}><i style={{ width: `${e.overall}%` }} /></div></div></div>}</td>
                    <td>{a.submittedAt ? recBadge(e.recommendation) : '-'}{a.review.decision && <div className="muted small">Decision: {a.review.decision.replace('_', ' ')}</div>}</td>
                    <td className="small">{a.flags.blur > 0 || a.flags.paste > 0 ? <span title="Tab/window switches and pastes during the test" className={a.flags.blur > 5 || a.flags.paste > 3 ? 'err' : 'muted'}>{a.flags.blur} switch · {a.flags.paste} paste</span> : <span className="muted">-</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
