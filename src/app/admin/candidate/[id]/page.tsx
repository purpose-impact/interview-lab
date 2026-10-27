import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { getAttempt } from '@/lib/store';
import { evaluate, toOriginal } from '@/lib/scoring';
import { loadBank } from '@/lib/bank';
import { candidateKey } from '@/lib/candidates';
import { CAT_ORDER, CATS, LEVELS, LIVE_DIMENSIONS } from '@/lib/categories';
import { AdminShell, Bar, fmtDate, pctClass, recBadge } from '../../ui';
import { DeleteButton, ReviewForm } from '../../AdminBits';
import Radar from '../../Radar';
import { Question, TextQ, isChoice } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Candidate({ params }: { params: { id: string } }) {
  if (!isAdmin()) return <main className="wrap narrow"><div className="panel"><p>Please <Link href="/admin">sign in</Link> first.</p></div></main>;
  const a = await getAttempt(params.id);
  if (!a) notFound();
  const bank = await loadBank();
  const e = evaluate(a, bank);

  const qs = a.qids.map((id) => bank.byId[id]).filter((q): q is Question => !!q);
  const choice = qs.filter(isChoice);
  const textQs = qs.filter((q): q is TextQ => !isChoice(q));
  const item = (id: string) => e.items.find((i) => i.id === id);

  const textItems = textQs.map((q) => ({
    id: q.id, q: q.q, code: q.code, answer: typeof a.answers[q.id] === 'string' ? (a.answers[q.id] as string) : '',
    mono: q.type === 'code', lookFor: q.lookFor, suggested: item(q.id)?.suggested ?? 0,
    score: a.review.scores[q.id], note: a.review.notes[q.id],
  }));
  const mins = a.submittedAt ? Math.round((new Date(a.submittedAt).getTime() - new Date(a.createdAt).getTime()) / 60000) : null;
  const scored = CAT_ORDER.filter((c) => e.cats[c].pct !== null);

  return (
    <AdminShell>
      <p className="small"><Link href="/admin">← Dashboard</Link></p>
      <div className="panel">
        <div className="row between">
          <div>
            <h1 style={{ marginBottom: 2 }}>{a.name}</h1>
            <div className="muted">{a.email} · {LEVELS[a.level].label}{a.yearsExp ? ` · ${a.yearsExp} yrs` : ''}</div>
            <div className="muted small">Started {fmtDate(a.createdAt)} · {a.submittedAt ? `Submitted ${fmtDate(a.submittedAt)} (${mins} of ${LEVELS[a.level].minutes} min)` : 'Not submitted yet'}</div>
            <div className="row noprint" style={{ margin: '8px 0' }}>
              <a className="btn" href={`/api/admin/report?attempt=${a.id}`} download>Download feedback summary</a>
              <Link className="btn" href={`/admin/report?attempt=${a.id}`}>Printable report / PDF</Link>
              <Link className="btn" href={`/admin/candidates/${encodeURIComponent(candidateKey(a.email))}`}>All tests &amp; combined profile</Link>
            </div>
            <div className="muted small">Integrity signals: {a.flags.blur} tab/window switches · {a.flags.paste} pastes</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2.4rem', fontWeight: 700, lineHeight: 1 }}>{e.overall === null ? '-' : `${e.overall.toFixed(0)}%`}</div>
            <div style={{ marginTop: 6 }}>{recBadge(a.submittedAt ? e.recommendation : 'In progress')}</div>
            {e.pendingCount > 0 && <div className="small" style={{ color: 'var(--warn)', marginTop: 4 }}>{e.pendingCount} answer(s) not yet scored by you</div>}
          </div>
        </div>
      </div>

      <div className="two">
        <section className="panel">
          <h2>Skill profile</h2>
          <Radar labels={scored.map((c) => CATS[c].short)} values={scored.map((c) => e.cats[c].pct)} />
        </section>
        <section className="panel">
          <h2>Score by area</h2>
          {CAT_ORDER.map((c) => (
            <div className="barrow" key={c}>
              <span title={CATS[c].label}>{CATS[c].short}</span>
              <Bar pct={e.cats[c].pct} />
              <b className={e.cats[c].pct !== null ? `pill-${pctClass(e.cats[c].pct) === 'good' ? 'green' : pctClass(e.cats[c].pct) === 'bad' ? 'red' : ''}` : ''}>{e.cats[c].pct === null ? '-' : `${e.cats[c].pct!.toFixed(0)}%`}</b>
            </div>
          ))}
          <p className="muted small">Objective (auto-graded) score: {e.objective.correct.toFixed(1)} / {e.objective.total} ({e.objective.pct?.toFixed(0) ?? '-'}%)</p>
        </section>
      </div>

      <section className="panel">
        <ReviewForm
          attemptId={a.id}
          textItems={textItems}
          live={LIVE_DIMENSIONS.map((d) => ({ ...d, value: a.review.live[d.id] }))}
          liveNotes={a.review.liveNotes ?? ''}
          decision={a.review.decision ?? ''}
          reviewer={a.review.reviewer ?? ''}
        />
      </section>

      <section className="panel">
        <h2>Multiple-choice breakdown</h2>
        <p className="muted small">Options are shown in the original order. Green = correct, red = candidate wrongly selected.</p>
        {choice.map((q) => {
          const picked = toOriginal(a.answers[q.id], a.perm?.[q.id]);
          const frac = item(q.id)?.frac ?? 0;
          return (
            <details className="qcard" key={q.id}>
              <summary>
                <span className={frac === 1 ? 'ok' : frac > 0 ? '' : 'err'}>{frac === 1 ? '✓' : frac > 0 ? '≈' : '✗'}</span> {CATS[q.cat].short} · {q.q.slice(0, 110)}{q.q.length > 110 ? '…' : ''}
              </summary>
              <div style={{ marginTop: 10 }}>
                <b style={{ whiteSpace: 'pre-wrap' }}>{q.q}</b>
                {q.code && <pre className="code">{q.code}</pre>}
                <ul className="tight">
                  {q.opts.map((o, i) => {
                    const isAns = q.ans.includes(i), isPick = picked.includes(i);
                    return <li key={i} className={isAns ? 'ok' : isPick ? 'err' : ''}>{o}{isAns ? '  ✓ correct' : ''}{isPick ? '  ← selected' : ''}</li>;
                  })}
                  {picked.length === 0 && <li className="muted">(not answered)</li>}
                </ul>
                <p className="muted small">Why: {q.why}</p>
              </div>
            </details>
          );
        })}
      </section>

      <div className="noprint"><DeleteButton id={a.id} /></div>
    </AdminShell>
  );
}
