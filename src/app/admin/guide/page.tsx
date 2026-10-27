import Link from 'next/link';
import { isAdmin } from '@/lib/auth';
import { FLOW, GUIDE, SCALE } from '@/lib/guide';
import { AdminShell } from '../ui';

export const dynamic = 'force-dynamic';

export default function Guide() {
  if (!isAdmin()) return <main className="wrap narrow"><div className="panel"><p>Please <Link href="/admin">sign in</Link> first.</p></div></main>;
  return (
    <AdminShell active="guide">
      <h1>Interviewer guide</h1>
      <p className="muted">Live-interview questions with follow-ups, what strong answers look like and red flags. Use it alongside the candidate&apos;s test results. Press Ctrl/Cmd+P to print.</p>

      <div className="two">
        <section className="panel">
          <h2>Suggested 80-minute flow</h2>
          <ul className="tight">{FLOW.map((f) => <li key={f.t}><b>{f.t}</b> - {f.what}</li>)}</ul>
        </section>
        <section className="panel">
          <h2>0-5 scoring scale</h2>
          <ul className="tight">{SCALE.map(([n, d]) => <li key={n}><b>{n}</b> - {d}</li>)}</ul>
          <p className="muted small">Assess practical depth, design reasoning, trade-offs, performance impact and production troubleshooting - not definitions alone.</p>
        </section>
      </div>

      <nav className="panel noprint small">
        <b>Jump to:</b>{' '}
        {GUIDE.map((s, i) => <span key={s.id}><a href={`#${s.id}`}>{s.title}</a>{i < GUIDE.length - 1 ? ' · ' : ''}</span>)}
      </nav>

      {GUIDE.map((s) => (
        <section className="panel" id={s.id} key={s.id}>
          <div className="row between"><h2>{s.title}</h2><span className="badge b-info">{s.weight}</span></div>
          {s.intro && <p className="muted">{s.intro}</p>}
          {s.questions.map((q, i) => (
            <div className="qcard" key={i}>
              <b style={{ whiteSpace: 'pre-wrap' }}>{i + 1}. {q.q}</b>
              <div className="two" style={{ marginTop: 10 }}>
                <div><div className="small muted">Follow-ups</div><ul className="tight">{q.followUps.map((f, j) => <li key={j}>{f}</li>)}</ul></div>
                <div>
                  <div className="small ok">Strong signals</div><ul className="tight">{q.strong.map((f, j) => <li key={j}>{f}</li>)}</ul>
                  <div className="small err">Red flags</div><ul className="tight">{q.red.map((f, j) => <li key={j}>{f}</li>)}</ul>
                </div>
              </div>
            </div>
          ))}
        </section>
      ))}
    </AdminShell>
  );
}
