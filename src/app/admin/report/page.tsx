import Link from 'next/link';
import { isAdmin } from '@/lib/auth';
import { getAttempt, listAttempts } from '@/lib/store';
import { loadBank } from '@/lib/bank';
import { candidateKey } from '@/lib/candidates';
import { AreaRow, buildReport } from '@/lib/report';
import { Attempt } from '@/lib/types';
import { AdminShell, Bar, fmtDate, recBadge } from '../ui';
import Radar from '../Radar';
import PrintButton from './PrintButton';

export const dynamic = 'force-dynamic';

const pct = (v: number | null) => (v === null ? '-' : `${v.toFixed(0)}%`);

/** Skill profile: radar chart beside the per-area bars. */
function Areas({ rows }: { rows: AreaRow[] }) {
  const scored = rows.filter((a) => a.pct !== null);
  return (
    <div className="two avoid-break">
      <div><Radar labels={scored.map((a) => a.short)} values={scored.map((a) => a.pct)} size={300} /></div>
      <div>
        {scored.map((a) => (
          <div className="barrow" key={a.id}><span title={a.label}>{a.short}</span><Bar pct={a.pct} /><b>{pct(a.pct)}</b></div>
        ))}
      </div>
    </div>
  );
}

export default async function ReportPage({ searchParams }: { searchParams: { attempt?: string; candidate?: string } }) {
  if (!isAdmin()) return <main className="wrap narrow"><div className="panel"><p>Please <Link href="/admin">sign in</Link> first.</p></div></main>;

  let attempts: Attempt[] = [];
  let query = '';
  if (searchParams.attempt) {
    const a = await getAttempt(searchParams.attempt);
    if (a) attempts = [a];
    query = `attempt=${encodeURIComponent(searchParams.attempt)}`;
  } else if (searchParams.candidate) {
    const key = candidateKey(searchParams.candidate);
    attempts = (await listAttempts()).filter((a) => candidateKey(a.email) === key);
    query = `candidate=${encodeURIComponent(searchParams.candidate)}`;
  }
  if (attempts.length === 0) return <AdminShell><div className="panel"><p>No tests found for this report.</p></div></AdminShell>;

  const r = buildReport(attempts, await loadBank());
  const back = searchParams.candidate
    ? `/admin/candidates/${encodeURIComponent(candidateKey(searchParams.candidate))}`
    : `/admin/candidate/${searchParams.attempt}`;

  return (
    <AdminShell>
      <div className="row between noprint" style={{ marginBottom: 12 }}>
        <Link href={back}>← Back</Link>
        <div className="row">
          <a className="btn" href={`/api/admin/report?${query}`} download>Download (.md)</a>
          <PrintButton />
        </div>
      </div>

      <h1 style={{ marginBottom: 2 }}>Interview feedback summary</h1>
      <div className="muted">{r.name} · {r.email}</div>
      <div className="muted small" style={{ marginBottom: 16 }}>Generated {fmtDate(r.generatedAt)}</div>

      {r.combined && (
        <section className="panel">
          <h2>Combined profile across {r.combined.tests} tests</h2>
          <div className="row" style={{ gap: 20 }}>
            <div style={{ fontSize: '2.2rem', fontWeight: 700 }}>{pct(r.combined.overall)}</div>
            {recBadge(r.combined.recommendation)}
            <span className="muted small">Objective questions {r.combined.objective.correct.toFixed(1)} / {r.combined.objective.total} ({pct(r.combined.objective.pct)})</span>
          </div>
          {r.combined.pending > 0 && <p className="small" style={{ color: 'var(--warn)' }}>{r.combined.pending} written answer(s) still use the automatic suggestion because no interviewer has scored them.</p>}
          <Areas rows={r.combined.areas} />
        </section>
      )}

      {r.attempts.map((a, i) => (
        <section className="panel report-test" key={a.id}>
          <h2>Test {i + 1} of {r.attempts.length} · {a.level}</h2>
          <div className="muted small">Started {fmtDate(a.started)} · {a.submitted ? `submitted ${fmtDate(a.submitted)} (${a.minutes} of ${a.limit} min)` : 'not submitted'} · {a.flags.blur} tab switches, {a.flags.paste} pastes</div>
          <div className="row" style={{ gap: 20, margin: '10px 0' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{pct(a.overall)}</div>
            {recBadge(a.recommendation)}
            {a.decision && <span>Interviewer decision: <b>{a.decision}</b>{a.reviewer ? ` (${a.reviewer})` : ''}</span>}
          </div>
          <Areas rows={a.areas} />
          <p className="muted small">Objective questions {a.objective.correct.toFixed(1)} / {a.objective.total} ({pct(a.objective.pct)})</p>

          {(a.live.length > 0 || a.liveNotes) && (
            <>
              <h3>Live interview</h3>
              <ul className="tight">{a.live.map((l) => <li key={l.label}>{l.label}: <b>{l.value}/5</b></li>)}</ul>
              {a.liveNotes && <p style={{ whiteSpace: 'pre-wrap' }}>{a.liveNotes}</p>}
            </>
          )}

          {a.text.length > 0 && <h3>Written and coding answers</h3>}
          {a.text.map((t, n) => (
            <div key={n} className="qcard">
              <b style={{ whiteSpace: 'pre-wrap' }}>{n + 1}. [{t.area}] {t.question}</b>
              <div className="small">
                Score: <b>{t.score === null ? 'not answered' : `${t.score}/5`}</b>
                {t.score !== null && <span className="muted"> ({t.scoredBy === 'interviewer' ? 'interviewer' : 'automatic suggestion, not yet reviewed'})</span>}
              </div>
              {t.note && <div className="small">Interviewer note: {t.note}</div>}
              <div className="ans" style={{ whiteSpace: 'pre-wrap' }}>{t.answer.trim() || '(no answer)'}</div>
            </div>
          ))}
        </section>
      ))}
    </AdminShell>
  );
}
