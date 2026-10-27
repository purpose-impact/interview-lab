import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { Attempt, Level } from '@/lib/types';
import { LEVELS } from '@/lib/categories';
import { buildPaper, buildPerms } from '@/lib/build';
import { loadBank } from '@/lib/bank';
import { saveAttempt } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const name = String(b.name ?? '').trim().slice(0, 80);
  const email = String(b.email ?? '').trim().slice(0, 120);
  const level = String(b.level ?? '') as Level;
  const yearsExp = String(b.yearsExp ?? '').trim().slice(0, 10);
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || !(level in LEVELS)) {
    return NextResponse.json({ error: 'Name, a valid email and level are required.' }, { status: 400 });
  }
  const required = process.env.TEST_ACCESS_CODE;
  if (required && String(b.code ?? '').trim() !== required) {
    return NextResponse.json({ error: 'Invalid access code.' }, { status: 403 });
  }

  const now = Date.now();
  const bank = await loadBank();
  const qids = buildPaper(level, bank);
  const attempt: Attempt = {
    id: randomBytes(12).toString('base64url'),
    name, email, level, yearsExp,
    createdAt: new Date(now).toISOString(),
    deadline: new Date(now + LEVELS[level].minutes * 60_000).toISOString(),
    qids,
    perm: buildPerms(qids, bank),
    answers: {},
    flags: { blur: 0, paste: 0 },
    review: { scores: {}, notes: {}, live: {}, liveNotes: '' },
  };
  await saveAttempt(attempt);
  return NextResponse.json({ id: attempt.id });
}
