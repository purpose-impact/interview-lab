'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error || 'Login failed'); setBusy(false); return; }
    router.refresh();
  }
  return (
    <form className="panel" onSubmit={go}>
      <h2>Interviewer sign-in</h2>
      <label htmlFor="pw">Admin password</label>
      <input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus required />
      {err && <p className="err" role="alert">{err}</p>}
      <div style={{ marginTop: 14 }}><button className="primary" disabled={busy}>Sign in</button></div>
    </form>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return <button onClick={async () => { await fetch('/api/admin/logout', { method: 'POST' }); router.refresh(); }}>Sign out</button>;
}

export function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  if (!armed) return <button className="danger" onClick={() => setArmed(true)}>Delete attempt…</button>;
  return (
    <span className="row">
      <span className="small err">Delete permanently?</span>
      <button className="danger" onClick={async () => { await fetch(`/api/admin/attempts/${id}`, { method: 'DELETE' }); router.push('/admin'); router.refresh(); }}>Yes, delete</button>
      <button onClick={() => setArmed(false)}>Cancel</button>
    </span>
  );
}

type TextItem = { id: string; q: string; code?: string; answer: string; mono: boolean; lookFor: string[]; suggested: number; score?: number; note?: string };
type Live = { id: string; label: string; hint: string; value?: number };

export function ReviewForm(props: {
  attemptId: string; textItems: TextItem[]; live: Live[]; liveNotes: string; decision: string; reviewer: string;
}) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, number | ''>>(() => Object.fromEntries(props.textItems.map((t) => [t.id, t.score ?? ''])));
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(props.textItems.map((t) => [t.id, t.note ?? ''])));
  const [live, setLive] = useState<Record<string, number | ''>>(() => Object.fromEntries(props.live.map((l) => [l.id, l.value ?? ''])));
  const [liveNotes, setLiveNotes] = useState(props.liveNotes);
  const [decision, setDecision] = useState(props.decision);
  const [reviewer, setReviewer] = useState(props.reviewer);
  const [state, setState] = useState<'' | 'saving' | 'saved' | 'error'>('');

  const scoreOpts = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
  async function save() {
    setState('saving');
    const clean = (o: Record<string, number | ''>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '')) as Record<string, number>;
    const r = await fetch(`/api/admin/attempts/${props.attemptId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores: clean(scores), notes, live: clean(live), liveNotes, decision, reviewer }),
    });
    setState(r.ok ? 'saved' : 'error');
    if (r.ok) router.refresh();
  }

  return (
    <div>
      <h2>Written &amp; hands-on answers</h2>
      <p className="muted small">Score each 0-5 (0 none · 1 weak · 2 basic · 3 solid · 4 strong · 5 expert). The suggestion is a keyword-coverage estimate only - until you score an answer, it is counted as “pending”.</p>
      {props.textItems.map((t) => (
        <div className="qcard" key={t.id}>
          <b style={{ whiteSpace: 'pre-wrap' }}>{t.q}</b>
          {t.code && <pre className="code">{t.code}</pre>}
          <div className={`ans${t.mono ? ' mono' : ''}`} style={{ marginTop: 8 }}>{t.answer.trim() ? t.answer : <span className="muted">(no answer)</span>}</div>
          <details style={{ marginTop: 8 }}>
            <summary>What a strong answer covers</summary>
            <ul className="tight">{t.lookFor.map((l, i) => <li key={i}>{l}</li>)}</ul>
          </details>
          <div className="row" style={{ marginTop: 10 }}>
            <label style={{ margin: 0 }} htmlFor={`s-${t.id}`}>Score</label>
            <select id={`s-${t.id}`} style={{ width: 150 }} value={scores[t.id]} onChange={(e) => setScores({ ...scores, [t.id]: e.target.value === '' ? '' : Number(e.target.value) })}>
              <option value="">Not scored (suggest {t.suggested})</option>
              {scoreOpts.map((n) => <option key={n} value={n}>{n} / 5</option>)}
            </select>
            <input placeholder="Notes (optional)" value={notes[t.id] ?? ''} onChange={(e) => setNotes({ ...notes, [t.id]: e.target.value })} style={{ flex: 1, minWidth: 200 }} />
          </div>
        </div>
      ))}

      <h2 style={{ marginTop: 28 }}>Live interview ratings</h2>
      <p className="muted small">Rate after the verbal discussion (project walkthrough, debugging approach, ownership). These feed the “Project” area.</p>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
        {props.live.map((l) => (
          <div className="qcard" key={l.id} style={{ marginBottom: 0 }}>
            <label htmlFor={`l-${l.id}`} style={{ marginTop: 0 }}>{l.label}</label>
            <div className="muted small" style={{ marginBottom: 6 }}>{l.hint}</div>
            <select id={`l-${l.id}`} value={live[l.id]} onChange={(e) => setLive({ ...live, [l.id]: e.target.value === '' ? '' : Number(e.target.value) })}>
              <option value="">Not rated</option>
              {scoreOpts.map((n) => <option key={n} value={n}>{n} / 5</option>)}
            </select>
          </div>
        ))}
      </div>
      <label htmlFor="ln">Interviewer notes</label>
      <textarea id="ln" value={liveNotes} onChange={(e) => setLiveNotes(e.target.value)} style={{ minHeight: 110 }} />

      <div className="two" style={{ marginTop: 8 }}>
        <div>
          <label htmlFor="dec">Final decision</label>
          <select id="dec" value={decision} onChange={(e) => setDecision(e.target.value)}>
            <option value="">Not decided</option>
            <option value="strong_hire">Strong hire</option><option value="hire">Hire</option>
            <option value="borderline">Borderline</option><option value="no_hire">No hire</option>
          </select>
        </div>
        <div><label htmlFor="rev">Reviewer name</label><input id="rev" value={reviewer} onChange={(e) => setReviewer(e.target.value)} /></div>
      </div>
      <div className="row" style={{ marginTop: 18 }}>
        <button className="primary" onClick={save} disabled={state === 'saving'}>{state === 'saving' ? 'Saving…' : 'Save review'}</button>
        {state === 'saved' && <span className="ok">Saved - summary updated</span>}
        {state === 'error' && <span className="err">Save failed</span>}
      </div>
    </div>
  );
}
