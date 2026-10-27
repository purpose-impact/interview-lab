import Link from 'next/link';
import { isAdmin } from '@/lib/auth';
import { listAttempts } from '@/lib/store';
import { loadBank } from '@/lib/bank';
import { aggregate, evaluate } from '@/lib/scoring';
import { groupCandidates } from '@/lib/candidates';
import { AdminShell, fmtDate, pctClass, recBadge } from '../ui';

export const dynamic = 'force-dynamic';

export default async function CandidatesPage() {
  if (!isAdmin()) return <main className="wrap narrow"><div className="panel"><p>Please <Link href="/admin">sign in</Link> first.</p></div></main>;
  const [all, bank] = await Promise.all([listAttempts(), loadBank()]);
  const rows = groupCandidates(all).map((g) => {
    const done = g.attempts.filter((a) => a.submittedAt);
    const agg = done.length ? aggregate(done.map((a) => evaluate(a, bank))) : null;
    return { g, done: done.length, agg, last: g.attempts[g.attempts.length - 1] };
  });

  return (
    <AdminShell active="candidates">
      <h1>Candidates</h1>
      <p className="muted">
        Tests taken with the same email address are combined into one candidate. The combined score pools every question the candidate answered across all submitted tests,
        so each skill area reflects all the evidence collected so far.
      </p>
      <section className="panel">
        <div className="tablewrap">
          <table>
            <thead><tr><th>Candidate</th><th>Tests</th><th>Last test</th><th style={{ minWidth: 130 }}>Combined score</th><th>Recommendation</th><th></th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="muted">No candidates yet.</td></tr>}
              {rows.map(({ g, done, agg, last }) => (
                <tr key={g.key}>
                  <td><Link href={`/admin/candidates/${encodeURIComponent(g.key)}`}><b>{g.name}</b></Link><div className="muted small">{g.email}</div></td>
                  <td>{done} submitted{g.attempts.length > done ? <span className="muted small"> · {g.attempts.length - done} in progress</span> : ''}</td>
                  <td className="small">{fmtDate(last.createdAt)}</td>
                  <td>{agg?.overall == null ? '-' : <div className="row" style={{ flexWrap: 'nowrap' }}><b style={{ width: 40 }}>{agg.overall.toFixed(0)}%</b><div style={{ flex: 1, minWidth: 70 }}><div className={`bar ${pctClass(agg.overall)}`}><i style={{ width: `${agg.overall}%` }} /></div></div></div>}</td>
                  <td>{agg ? recBadge(agg.recommendation) : '-'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className="row">
                      <Link className="btn" href={`/admin/candidates/${encodeURIComponent(g.key)}`}>View</Link>
                      <a className="btn" href={`/api/admin/report?candidate=${encodeURIComponent(g.key)}`} download>Download</a>
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
