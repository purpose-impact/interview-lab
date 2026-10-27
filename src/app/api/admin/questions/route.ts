import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { listAttempts, saveOverlay } from '@/lib/store';
import { loadBank } from '@/lib/bank';
import { normalizeQuestion } from '@/lib/qvalidate';

export const dynamic = 'force-dynamic';

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

/** GET: JSON export of every active question (same shape the importer accepts). */
export async function GET() {
  if (!isAdmin()) return unauthorized();
  const bank = await loadBank();
  const active = Object.values(bank.byId).filter((q) => !bank.retired.has(q.id));
  return new Response(JSON.stringify(active, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="interview-questions.json"' },
  });
}

export async function POST(req: Request) {
  if (!isAdmin()) return unauthorized();
  const b = (await req.json().catch(() => null)) as { action?: string; id?: string; isNew?: boolean; question?: unknown; questions?: unknown } | null;
  if (!b) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const bank = await loadBank();
  const o = bank.overlay;
  const id = String(b.id ?? '');

  switch (b.action) {
    case 'upsert': {
      const r = normalizeQuestion(b.question);
      if ('error' in r) return NextResponse.json({ error: r.error }, { status: 400 });
      if (b.isNew && bank.byId[r.q.id]) return NextResponse.json({ error: `A question with id "${r.q.id}" already exists` }, { status: 409 });
      o.custom[r.q.id] = r.q;
      o.retired = o.retired.filter((x) => x !== r.q.id);
      await saveOverlay(o);
      return NextResponse.json({ ok: true, id: r.q.id });
    }
    case 'import': {
      if (!Array.isArray(b.questions)) return NextResponse.json({ error: 'Expected a JSON array of questions' }, { status: 400 });
      if (b.questions.length > 500) return NextResponse.json({ error: 'At most 500 questions per import' }, { status: 400 });
      let added = 0, updated = 0;
      const errors: string[] = [];
      const seen = new Set<string>();
      b.questions.forEach((raw, i) => {
        const r = normalizeQuestion(raw);
        if ('error' in r) { errors.push(`#${i + 1}: ${r.error}`); return; }
        if (seen.has(r.q.id)) { errors.push(`#${i + 1}: duplicate id "${r.q.id}" in file`); return; }
        seen.add(r.q.id);
        if (bank.byId[r.q.id]) updated++; else added++;
        o.custom[r.q.id] = r.q;
        o.retired = o.retired.filter((x) => x !== r.q.id);
      });
      if (added + updated > 0) await saveOverlay(o);
      return NextResponse.json({ ok: true, added, updated, errors });
    }
    case 'retire': {
      if (!bank.byId[id]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (!o.retired.includes(id)) o.retired.push(id);
      await saveOverlay(o);
      return NextResponse.json({ ok: true });
    }
    case 'restore': {
      o.retired = o.retired.filter((x) => x !== id);
      await saveOverlay(o);
      return NextResponse.json({ ok: true });
    }
    case 'reset': { // drop admin edits to a built-in question
      if (!bank.builtinIds.has(id)) return NextResponse.json({ error: 'Only built-in questions can be reset' }, { status: 400 });
      delete o.custom[id];
      await saveOverlay(o);
      return NextResponse.json({ ok: true });
    }
    case 'purge': { // permanently delete an added question that no attempt used
      if (bank.builtinIds.has(id) || !o.custom[id]) return NextResponse.json({ error: 'Only added questions can be deleted permanently' }, { status: 400 });
      const used = (await listAttempts()).some((a) => a.qids.includes(id));
      if (used) return NextResponse.json({ error: 'Used in candidate attempts - remove it instead so their history stays intact' }, { status: 409 });
      delete o.custom[id];
      o.retired = o.retired.filter((x) => x !== id);
      await saveOverlay(o);
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
