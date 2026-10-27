import { NextResponse } from 'next/server';
import { getAttempt, saveAttempt } from '@/lib/store';
import { loadBank } from '@/lib/bank';
import { sanitizeAnswers, sanitizeFlags } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';
const GRACE_MS = 90_000;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = await getAttempt(params.id);
  if (!a) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (a.submittedAt) return NextResponse.json({ ok: true });
  const b = await req.json().catch(() => ({}));
  const inTime = Date.now() <= new Date(a.deadline).getTime() + GRACE_MS;
  if (inTime) {
    a.answers = { ...a.answers, ...sanitizeAnswers(a, b.answers, await loadBank()) };
    a.flags = sanitizeFlags(a, b.flags);
  }
  a.submittedAt = new Date().toISOString();
  await saveAttempt(a);
  return NextResponse.json({ ok: true });
}
