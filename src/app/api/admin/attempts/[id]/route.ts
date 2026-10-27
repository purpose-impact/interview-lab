import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { deleteAttempt, getAttempt, saveAttempt } from '@/lib/store';
import { Review } from '@/lib/types';

export const dynamic = 'force-dynamic';

const clamp = (n: unknown) => (typeof n === 'number' && isFinite(n) ? Math.min(5, Math.max(0, n)) : undefined);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const a = await getAttempt(params.id);
  if (!a) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as Partial<Review>;

  const scores: Review['scores'] = {};
  for (const [k, v] of Object.entries(b.scores ?? {})) { const c = clamp(v); if (c !== undefined && a.qids.includes(k)) scores[k] = c; }
  const live: Review['live'] = {};
  for (const [k, v] of Object.entries(b.live ?? {})) { const c = clamp(v); if (c !== undefined) live[k] = c; }
  const notes: Review['notes'] = {};
  for (const [k, v] of Object.entries(b.notes ?? {})) if (typeof v === 'string' && v.trim()) notes[k] = v.slice(0, 2000);

  a.review = {
    scores, live, notes,
    liveNotes: String(b.liveNotes ?? '').slice(0, 5000),
    decision: (['strong_hire', 'hire', 'borderline', 'no_hire', ''] as const).includes(b.decision as never) ? (b.decision as Review['decision']) : '',
    reviewer: String(b.reviewer ?? '').slice(0, 80),
    reviewedAt: new Date().toISOString(),
  };
  await saveAttempt(a);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await deleteAttempt(params.id);
  return NextResponse.json({ ok: true });
}
