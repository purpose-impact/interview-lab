'use client';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CatId, Level, Question, isChoice } from '@/lib/types';

export type Row = { q: Question; source: 'built-in' | 'added' | 'edited'; retired: boolean };
type Opt = { t: string; correct: boolean };
type Draft = {
  isNew: boolean; id: string; type: Question['type']; cat: CatId; d: 1 | 2 | 3; q: string; code: string;
  opts: Opt[]; why: string; starter: string; lookFor: string; keywords: string; levels: Level[];
};

const DIFF = { 1: 'Foundation', 2: 'Senior', 3: 'Lead' } as const;
const TYPES: Record<Question['type'], string> = { mcq: 'Multiple choice (one answer)', multi: 'Multiple choice (select all)', text: 'Written answer', code: 'Code answer' };

const blank = (cat: CatId): Draft => ({
  isNew: true, id: '', type: 'mcq', cat, d: 2, q: '', code: '',
  opts: [{ t: '', correct: true }, { t: '', correct: false }, { t: '', correct: false }, { t: '', correct: false }],
  why: '', starter: '', lookFor: '', keywords: '', levels: ['mid', 'senior', 'lead'],
});

function toDraft(q: Question): Draft {
  const base = { isNew: false, id: q.id, type: q.type, cat: q.cat, d: q.d, q: q.q, code: q.code ?? '' };
  if (isChoice(q)) {
    return { ...base, opts: q.opts.map((t, i) => ({ t, correct: q.ans.includes(i) })), why: q.why, starter: '', lookFor: '', keywords: '', levels: [] };
  }
  return {
    ...base, opts: [], why: '', starter: q.starter ?? '', lookFor: q.lookFor.join('\n'),
    keywords: q.rubric.map((g) => g.join(' | ')).join('\n'), levels: q.levels ?? [],
  };
}

function toPayload(d: Draft) {
  const out: Record<string, unknown> = { id: d.id.trim() || undefined, type: d.type, cat: d.cat, d: d.d, q: d.q, code: d.code };
  if (d.type === 'mcq' || d.type === 'multi') {
    const kept = d.opts.map((o, i) => ({ ...o, i })).filter((o) => o.t.trim());
    out.opts = kept.map((o) => o.t);
    out.ans = kept.map((o, n) => (o.correct ? n : -1)).filter((n) => n >= 0);
    out.why = d.why;
  } else {
    out.starter = d.starter;
    out.lookFor = d.lookFor.split('\n');
    out.rubric = d.keywords.split('\n').map((l) => l.split('|').map((k) => k.trim()).filter(Boolean)).filter((g) => g.length);
    out.levels = d.levels;
  }
  return out;
}

async function post(body: unknown) {
  const r = await fetch('/api/admin/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, j };
}

export default function QuestionsAdmin(props: {
  rows: Row[]; mcqCats: CatId[]; cats: { id: CatId; label: string }[]; levels: { id: Level; label: string }[]; choiceCount: number;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; list?: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [fCat, setFCat] = useState(''); const [fType, setFType] = useState(''); const [fStatus, setFStatus] = useState('active'); const [fText, setFText] = useState('');

  const catLabel = (id: string) => props.cats.find((c) => c.id === id)?.label ?? id;
  const shown = useMemo(() => props.rows.filter((r) => {
    if (fCat && r.q.cat !== fCat) return false;
    if (fType === 'choice' ? !isChoice(r.q) : fType === 'text' ? isChoice(r.q) : false) return false;
    if (fStatus === 'active' && r.retired) return false;
    if (fStatus === 'removed' && !r.retired) return false;
    if (fText && !`${r.q.id} ${r.q.q}`.toLowerCase().includes(fText.toLowerCase())) return false;
    return true;
  }).sort((a, b) => a.q.cat.localeCompare(b.q.cat) || a.q.d - b.q.d || a.q.id.localeCompare(b.q.id)), [props.rows, fCat, fType, fStatus, fText]);

  async function act(body: Record<string, unknown>, okText: string) {
    setBusy(true); setMsg(null);
    const { ok, j } = await post(body);
    setBusy(false);
    if (!ok) { setMsg({ ok: false, text: j.error || 'Failed' }); return false; }
    setMsg({ ok: true, text: okText }); router.refresh(); return true;
  }

  async function save() {
    if (!draft) return;
    if (await act({ action: 'upsert', isNew: draft.isNew, question: toPayload(draft) }, draft.isNew ? 'Question added.' : 'Question saved.')) setDraft(null);
  }

  async function importFile(f: File) {
    setBusy(true); setMsg(null);
    try {
      const parsed = JSON.parse(await f.text());
      const questions = Array.isArray(parsed) ? parsed : parsed?.questions;
      const { ok, j } = await post({ action: 'import', questions });
      if (!ok) setMsg({ ok: false, text: j.error || 'Import failed' });
      else { setMsg({ ok: !j.errors.length, text: `Imported: ${j.added} added, ${j.updated} updated, ${j.errors.length} rejected.`, list: j.errors }); router.refresh(); }
    } catch { setMsg({ ok: false, text: 'That file is not valid JSON.' }); }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const isChoiceDraft = draft ? draft.type === 'mcq' || draft.type === 'multi' : false;
  const catChoices = draft ? (isChoiceDraft ? props.cats.filter((c) => props.mcqCats.includes(c.id)) : props.cats) : [];

  function setType(t: Question['type']) {
    if (!draft) return;
    const toChoice = t === 'mcq' || t === 'multi';
    let cat = draft.cat;
    if (toChoice && !props.mcqCats.includes(cat)) cat = props.mcqCats[0];
    let opts = draft.opts;
    if (t === 'mcq') { let seen = false; opts = opts.map((o) => { const c = o.correct && !seen; seen ||= o.correct; return { ...o, correct: c }; }); }
    setDraft({ ...draft, type: t, cat, opts });
  }

  return (
    <>
      <div className="panel">
        <div className="row between">
          <h2 style={{ margin: 0 }}>Questions <span className="muted small">({props.rows.filter((r) => !r.retired).length} active)</span></h2>
          <div className="row">
            <button className="primary" onClick={() => { setMsg(null); setDraft(blank(props.mcqCats[0])); }}>+ Add question</button>
            <button onClick={() => fileRef.current?.click()} disabled={busy}>Import JSON…</button>
            <a className="btn" href="/api/admin/questions" download>Export JSON</a>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
          </div>
        </div>
        <p className="muted small" style={{ marginBottom: 0 }}>
          Bulk upload: export the current bank, edit or add entries, and import the file. Entries with an existing <code>id</code> replace that question; entries without one are added.
        </p>
        {msg && (
          <div role="status" className={msg.ok ? '' : 'err'} style={{ marginTop: 10 }}>
            <b>{msg.text}</b>
            {msg.list && msg.list.length > 0 && <ul className="small">{msg.list.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}</ul>}
          </div>
        )}
      </div>

      {draft && (
        <div className="panel">
          <h2>{draft.isNew ? 'Add question' : `Edit ${draft.id}`}</h2>
          {!draft.isNew && <p className="muted small">Changing options or answers of a question that candidates have already seen affects how their existing attempts are reviewed and scored.</p>}
          <div className="grid">
            <div>
              <label htmlFor="qt">Type</label>
              <select id="qt" value={draft.type} onChange={(e) => setType(e.target.value as Question['type'])}>
                {(Object.keys(TYPES) as Question['type'][]).map((t) => <option key={t} value={t}>{TYPES[t]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="qc">Skill area (category)</label>
              <select id="qc" value={draft.cat} onChange={(e) => set('cat', e.target.value as CatId)}>
                {catChoices.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="qd">Difficulty</label>
              <select id="qd" value={draft.d} onChange={(e) => set('d', Number(e.target.value) as 1 | 2 | 3)}>
                {([1, 2, 3] as const).map((d) => <option key={d} value={d}>{d} - {DIFF[d]}</option>)}
              </select>
            </div>
          </div>

          <label htmlFor="qq">Question</label>
          <textarea id="qq" rows={3} value={draft.q} onChange={(e) => set('q', e.target.value)} />
          <label htmlFor="qcode">Code snippet shown with the question (optional)</label>
          <textarea id="qcode" className="code" rows={4} value={draft.code} onChange={(e) => set('code', e.target.value)} />

          {isChoiceDraft ? (
            <>
              <label>Options - tick the correct {draft.type === 'mcq' ? 'one' : 'ones'} (order is shuffled for each candidate)</label>
              {draft.opts.map((o, i) => (
                <div className="row" key={i} style={{ marginBottom: 6 }}>
                  <input type={draft.type === 'mcq' ? 'radio' : 'checkbox'} name="correct" aria-label={`Option ${i + 1} is correct`} checked={o.correct} style={{ width: 'auto' }}
                    onChange={(e) => set('opts', draft.opts.map((x, j) => (draft.type === 'mcq' ? { ...x, correct: j === i } : j === i ? { ...x, correct: e.target.checked } : x)))} />
                  <input value={o.t} placeholder={`Option ${i + 1}`} onChange={(e) => set('opts', draft.opts.map((x, j) => (j === i ? { ...x, t: e.target.value } : x)))} />
                  <button type="button" onClick={() => set('opts', draft.opts.filter((_, j) => j !== i))} disabled={draft.opts.length <= 2} aria-label={`Remove option ${i + 1}`}>✕</button>
                </div>
              ))}
              <button type="button" onClick={() => set('opts', [...draft.opts, { t: '', correct: false }])} disabled={draft.opts.length >= 8}>+ Add option</button>
              <label htmlFor="qw">Explanation (shown to interviewers in the review)</label>
              <textarea id="qw" rows={3} value={draft.why} onChange={(e) => set('why', e.target.value)} />
            </>
          ) : (
            <>
              {draft.type === 'code' && (
                <>
                  <label htmlFor="qs">Starter code (optional)</label>
                  <textarea id="qs" className="code" rows={4} value={draft.starter} onChange={(e) => set('starter', e.target.value)} />
                </>
              )}
              <label htmlFor="ql">What a strong answer covers (one point per line, shown to interviewers)</label>
              <textarea id="ql" rows={4} value={draft.lookFor} onChange={(e) => set('lookFor', e.target.value)} />
              <label htmlFor="qk">Keyword groups for the suggested score (optional: one group per line, alternatives separated by |)</label>
              <textarea id="qk" rows={3} placeholder={'synchronized | lock | concurrent\nhappens-before | volatile'} value={draft.keywords} onChange={(e) => set('keywords', e.target.value)} />
              <p className="muted small">The suggested score is the share of groups the answer mentions. You always give the final 0-5 score. Leave empty to score manually.</p>
              {draft.cat !== 'handson' ? (
                <>
                  <label>Always include in the paper for</label>
                  <div className="row">
                    {props.levels.map((l) => (
                      <label key={l.id} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', margin: 0 }}>
                        <input type="checkbox" style={{ width: 'auto' }} checked={draft.levels.includes(l.id)}
                          onChange={(e) => set('levels', e.target.checked ? [...draft.levels, l.id] : draft.levels.filter((x) => x !== l.id))} />
                        {l.label.split(' ')[0]}
                      </label>
                    ))}
                  </div>
                  <p className="muted small">Written questions in a skill area are included in full for the levels you tick. Hands-on questions are instead drawn at random from the hands-on pool.</p>
                </>
              ) : (
                <p className="muted small">Hands-on questions are drawn at random from the hands-on pool, by difficulty.</p>
              )}
            </>
          )}
          <div className="row" style={{ marginTop: 14 }}>
            <button className="primary" onClick={save} disabled={busy}>{draft.isNew ? 'Add question' : 'Save changes'}</button>
            <button onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="row" style={{ marginBottom: 10 }}>
          <input style={{ maxWidth: 240 }} placeholder="Search text or id" aria-label="Search questions" value={fText} onChange={(e) => setFText(e.target.value)} />
          <select style={{ maxWidth: 220 }} aria-label="Filter by category" value={fCat} onChange={(e) => setFCat(e.target.value)}>
            <option value="">All skill areas</option>
            {props.cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select style={{ maxWidth: 160 }} aria-label="Filter by type" value={fType} onChange={(e) => setFType(e.target.value)}>
            <option value="">All types</option><option value="choice">Multiple choice</option><option value="text">Written / code</option>
          </select>
          <select style={{ maxWidth: 160 }} aria-label="Filter by status" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="active">Active</option><option value="removed">Removed</option><option value="">All</option>
          </select>
          <span className="muted small">{shown.length} shown</span>
        </div>
        <div className="tablewrap">
          <table>
            <thead><tr><th>ID</th><th>Area</th><th>Type</th><th>Level</th><th>Question</th><th>Source</th><th></th></tr></thead>
            <tbody>
              {shown.map(({ q, source, retired }) => (
                <tr key={q.id} style={retired ? { opacity: 0.55 } : undefined}>
                  <td><code>{q.id}</code></td>
                  <td title={catLabel(q.cat)}>{catLabel(q.cat).split(/[,&]/)[0]}</td>
                  <td>{q.type === 'mcq' ? 'MCQ' : q.type === 'multi' ? 'Multi' : q.type === 'code' ? 'Code' : 'Written'}</td>
                  <td>{DIFF[q.d]}</td>
                  <td style={{ maxWidth: 420 }}>{q.q.length > 140 ? q.q.slice(0, 140) + '…' : q.q}</td>
                  <td><span className="badge">{retired ? 'removed' : source}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className="row">
                      <button onClick={() => { setMsg(null); setDraft(toDraft(q)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button>
                      {retired
                        ? <button disabled={busy} onClick={() => act({ action: 'restore', id: q.id }, 'Question restored.')}>Restore</button>
                        : <button className="danger" disabled={busy} onClick={() => confirm(`Remove ${q.id} from new tests? Existing attempts keep it.`) && act({ action: 'retire', id: q.id }, 'Question removed from new tests.')}>Remove</button>}
                      {source === 'edited' && <button disabled={busy} onClick={() => confirm(`Discard your edits to ${q.id} and go back to the built-in version?`) && act({ action: 'reset', id: q.id }, 'Reset to built-in.')}>Reset</button>}
                      {source === 'added' && <button className="danger" disabled={busy} onClick={() => confirm(`Permanently delete ${q.id}? This cannot be undone.`) && act({ action: 'purge', id: q.id }, 'Question deleted.')}>Delete</button>}
                    </span>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={7} className="muted">No questions match.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
