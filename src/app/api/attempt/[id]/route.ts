import { NextResponse } from 'next/server';
import { getAttempt, saveAttempt } from '@/lib/store';
import { toPublic } from '@/lib/build';
import { loadBank } from '@/lib/bank';
import { sanitizeAnswers, sanitizeFlags } from '@/lib/sanitize';
import { LEVELS } from '@/lib/categories';

export const dynamic = 'force-dynamic';
const GRACE_MS = 90_000;

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const a = await getAttempt(params.id);
  if (!a) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (a.submittedAt) return NextResponse.json({ submitted: true, name: a.name });
  const bank = await loadBank();
  const questions = a.qids.map((id) => bank.byId[id]).filter(Boolean).map((q) => toPublic(q!, a.perm[q!.id]));
  return NextResponse.json({
    id: a.id, name: a.name, level: a.level, levelLabel: LEVELS[a.level].label,
    deadline: a.deadline, serverNow: Date.now(), questions, answers: a.answers,
  });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const a = await getAttempt(params.id);
  if (!a) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (a.submittedAt) return NextResponse.json({ error: 'Already submitted' }, { status: 409 });
  if (Date.now() > new Date(a.deadline).getTime() + GRACE_MS) return NextResponse.json({ error: 'Time is up' }, { status: 410 });
  const b = await req.json().catch(() => ({}));
  a.answers = { ...a.answers, ...sanitizeAnswers(a, b.answers, await loadBank()) };
  a.flags = sanitizeFlags(a, b.flags);
  await saveAttempt(a);
  return NextResponse.json({ ok: true, savedAt: Date.now() });
}
