'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StartForm({ levels, gated }: { levels: { id: string; label: string; minutes: number }[]; gated: boolean }) {
  const router = useRouter();
  const [f, setF] = useState({ name: '', email: '', level: 'senior', yearsExp: '', code: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const lvl = levels.find((l) => l.id === f.level);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    const r = await fetch('/api/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error || 'Could not start the test.'); setBusy(false); return; }
    try { localStorage.setItem('jil:last', j.id); } catch { /* ignore */ }
    router.push(`/test/${j.id}`);
  }

  return (
    <form className="panel" onSubmit={submit}>
      <h2>Your details</h2>
      <label htmlFor="name">Full name</label>
      <input id="name" required value={f.name} onChange={set('name')} autoComplete="name" />
      <label htmlFor="email">Email</label>
      <input id="email" type="email" required value={f.email} onChange={set('email')} autoComplete="email" />
      <label htmlFor="level">Experience band</label>
      <select id="level" value={f.level} onChange={set('level')}>
        {levels.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
      </select>
      <p className="muted small">Duration for this band: <b>{lvl?.minutes} minutes</b></p>
      <label htmlFor="yrs">Total years of Java experience (optional)</label>
      <input id="yrs" inputMode="numeric" value={f.yearsExp} onChange={set('yearsExp')} />
      {gated && (<><label htmlFor="code">Access code</label><input id="code" required value={f.code} onChange={set('code')} /></>)}
      {err && <p className="err" role="alert">{err}</p>}
      <div style={{ marginTop: 16 }}><button className="primary" disabled={busy}>{busy ? 'Preparing…' : 'Start assessment'}</button></div>
    </form>
  );
}
