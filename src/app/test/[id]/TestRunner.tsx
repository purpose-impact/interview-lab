'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '../../Logo';

type Q = {
  id: string; cat: string; d: number; type: 'mcq' | 'multi' | 'text' | 'code';
  q: string; code?: string; opts?: string[]; starter?: string;
};
type Loaded = { name: string; levelLabel: string; deadline: string; serverNow: number; questions: Q[]; answers: Record<string, number[] | string> };

const CAT_LABEL: Record<string, string> = {
  core: 'Core Java', conc: 'Concurrency', jvm: 'JVM / Debugging', sql: 'SQL / Data', modern: 'Modern Java', spring: 'Spring Boot',
  api: 'API design', report: 'Reporting', deploy: 'Deployment', handson: 'Hands-on coding', project: 'Project experience',
};

const fmt = (s: number) => {
  const m = Math.floor(s / 60), r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};

export default function TestRunner({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Record<string, number[] | string>>({});
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [review, setReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const flags = useRef({ blur: 0, paste: 0 });
  const skew = useRef(0);
  const dirty = useRef(false);
  const submitted = useRef(false);

  // ---- load
  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/attempt/${id}`, { cache: 'no-store' });
      if (r.status === 404) { setError('This test link is not valid.'); return; }
      const j = await r.json();
      if (j.submitted) { router.replace('/done'); return; }
      skew.current = j.serverNow - Date.now();
      let local: Record<string, number[] | string> = {};
      try { local = JSON.parse(localStorage.getItem(`jil:ans:${id}`) || '{}'); } catch { /* ignore */ }
      const merged: Record<string, number[] | string> = { ...j.answers, ...local };
      for (const q of j.questions as Q[]) if (q.type === 'code' && q.starter && !merged[q.id]) merged[q.id] = q.starter;
      setAnswers(merged);
      setData(j);
    })().catch(() => setError('Could not load the test. Please refresh.'));
  }, [id, router]);

  // ---- helpers
  const isAnswered = useCallback((q: Q) => {
    const a = answers[q.id];
    if (q.type === 'mcq' || q.type === 'multi') return Array.isArray(a) && a.length > 0;
    return typeof a === 'string' && a.trim().length > 0 && a.trim() !== (q.starter ?? '').trim();
  }, [answers]);

  const doSubmit = useCallback(async () => {
    if (submitted.current) return;
    submitted.current = true; setSubmitting(true);
    try {
      await fetch(`/api/attempt/${id}/submit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, flags: flags.current }),
      });
      try { localStorage.removeItem(`jil:ans:${id}`); } catch { /* ignore */ }
      router.replace('/done');
    } catch {
      submitted.current = false; setSubmitting(false); setError('Submit failed - check your connection and try again.');
    }
  }, [answers, id, router]);

  // ---- timer
  useEffect(() => {
    if (!data) return;
    const tick = () => {
      const s = Math.max(0, Math.round((new Date(data.deadline).getTime() - (Date.now() + skew.current)) / 1000));
      setLeft(s);
      if (s <= 0) doSubmit();
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [data, doSubmit]);

  // ---- autosave (debounced) + local backup
  useEffect(() => {
    if (!data || !dirty.current) return;
    try { localStorage.setItem(`jil:ans:${id}`, JSON.stringify(answers)); } catch { /* ignore */ }
    setSaveState('saving');
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/attempt/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers, flags: flags.current }) });
        setSaveState(r.ok ? 'saved' : 'error');
      } catch { setSaveState('error'); }
    }, 1200);
    return () => clearTimeout(t);
  }, [answers, data, id]);

  // ---- integrity signals
  useEffect(() => {
    const onBlur = () => { flags.current.blur += 1; };
    const onVis = () => { if (document.visibilityState === 'hidden') flags.current.blur += 1; };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVis);
    return () => { window.removeEventListener('blur', onBlur); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  const set = (qid: string, v: number[] | string) => { dirty.current = true; setAnswers((a) => ({ ...a, [qid]: v })); };
  const answeredCount = useMemo(() => (data ? data.questions.filter(isAnswered).length : 0), [data, isAnswered]);

  if (error) return <main className="wrap narrow"><div className="panel"><p className="err">{error}</p></div></main>;
  if (!data) return <main className="wrap narrow"><p className="muted">Loading your assessment…</p></main>;

  const q = data.questions[idx];
  const total = data.questions.length;
  const a = answers[q.id];

  function toggle(i: number) {
    if (q.type === 'mcq') return set(q.id, [i]);
    const cur = Array.isArray(a) ? a : [];
    set(q.id, cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]);
  }

  function onTab(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const t = e.currentTarget; const s = t.selectionStart, en = t.selectionEnd;
    const v = t.value.slice(0, s) + '  ' + t.value.slice(en);
    set(q.id, v);
    requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = s + 2; });
  }

  return (
    <>
      <div className="topbar">
        <div className="in">
          <div className="row"><Logo height={24} /><span className="brand">Java Assessment</span> <span className="muted small">· {data.name} · {data.levelLabel}</span></div>
          <div className="row">
            <span className="muted small" aria-live="polite">{saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Save failed - will retry' : ''}</span>
            <span className={`timer${left !== null && left < 300 ? ' low' : ''}`} role="timer">{left === null ? '--:--' : fmt(left)}</span>
          </div>
        </div>
      </div>

      <main className="wrap">
        {!review ? (
          <div className="runner">
            <section className="panel">
              <div className="row between">
                <span className="badge b-info">{CAT_LABEL[q.cat] ?? q.cat}</span>
                <span className="muted small">Question {idx + 1} of {total}{q.type === 'multi' ? ' · select all that apply' : ''}</span>
              </div>
              <h2 style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{q.q}</h2>
              {q.code && <pre className="code">{q.code}</pre>}

              {(q.type === 'mcq' || q.type === 'multi') && q.opts && (
                <div role={q.type === 'mcq' ? 'radiogroup' : 'group'}>
                  {q.opts.map((o, i) => {
                    const sel = Array.isArray(a) && a.includes(i);
                    return (
                      <label key={i} className={`opt${sel ? ' sel' : ''}`}>
                        <input type={q.type === 'mcq' ? 'radio' : 'checkbox'} name={q.id} checked={sel} onChange={() => toggle(i)} />
                        <span>{o}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {(q.type === 'text' || q.type === 'code') && (
                <>
                  <textarea
                    className={q.type === 'code' ? 'code' : ''}
                    value={typeof a === 'string' ? a : ''}
                    onChange={(e) => set(q.id, e.target.value)}
                    onKeyDown={q.type === 'code' ? onTab : undefined}
                    onPaste={() => { flags.current.paste += 1; }}
                    spellCheck={q.type === 'text'}
                    placeholder={q.type === 'text' ? 'Write your answer. Structure it clearly and give specifics.' : 'Write your code / SQL here, then explain key decisions in comments.'}
                    aria-label="Your answer"
                  />
                  <p className="muted small">{typeof a === 'string' ? a.trim().split(/\s+/).filter(Boolean).length : 0} words</p>
                </>
              )}

              <div className="row between" style={{ marginTop: 16 }}>
                <button onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}>← Previous</button>
                {idx < total - 1
                  ? <button className="primary" onClick={() => setIdx(idx + 1)}>Next →</button>
                  : <button className="primary" onClick={() => setReview(true)}>Review &amp; submit</button>}
              </div>
            </section>

            <aside className="panel">
              <h3>Progress</h3>
              <p className="muted small">{answeredCount} of {total} answered</p>
              <div className="navgrid">
                {data.questions.map((qq, i) => (
                  <button key={qq.id} className={`${isAnswered(qq) ? 'done' : ''} ${i === idx ? 'cur' : ''}`} onClick={() => setIdx(i)} aria-label={`Question ${i + 1}${isAnswered(qq) ? ' answered' : ''}`}>{i + 1}</button>
                ))}
              </div>
              <div style={{ marginTop: 14 }}><button onClick={() => setReview(true)}>Review &amp; submit</button></div>
            </aside>
          </div>
        ) : (
          <section className="panel">
            <h1>Review before submitting</h1>
            <p>You have answered <b>{answeredCount}</b> of <b>{total}</b> questions.</p>
            {answeredCount < total && (
              <>
                <p className="muted">Unanswered:</p>
                <div className="navgrid">
                  {data.questions.map((qq, i) => !isAnswered(qq) && (
                    <button key={qq.id} onClick={() => { setIdx(i); setReview(false); }}>{i + 1}</button>
                  ))}
                </div>
              </>
            )}
            <div className="row" style={{ marginTop: 20 }}>
              <button onClick={() => setReview(false)}>← Back to questions</button>
              <button className="primary" onClick={doSubmit} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit final answers'}</button>
            </div>
            <p className="muted small">Submission is final. The test also submits automatically when the timer reaches zero.</p>
          </section>
        )}
      </main>
    </>
  );
}
