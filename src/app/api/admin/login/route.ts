import { NextResponse } from 'next/server';
import { adminConfigured, checkPassword, makeSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!adminConfigured()) return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured on the server.' }, { status: 500 });
  const b = await req.json().catch(() => ({}));
  if (!checkPassword(String(b.password ?? ''))) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }
  const c = makeSessionCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(c.name, c.value, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: c.maxAge, path: '/' });
  return res;
}
