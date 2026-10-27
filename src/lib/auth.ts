import { createHmac, timingSafeEqual, randomBytes } from 'crypto';
import { cookies } from 'next/headers';

const COOKIE = 'jil_admin';

function secret(): string {
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || 'dev-secret';
}
export function adminConfigured(): boolean {
  return !!process.env.ADMIN_PASSWORD || process.env.NODE_ENV !== 'production';
}
function expectedPassword(): string {
  return process.env.ADMIN_PASSWORD || 'admin'; // dev default only (adminConfigured() blocks prod without a password)
}
function sign(v: string): string {
  return createHmac('sha256', secret()).update(v).digest('hex');
}
export function checkPassword(pw: string): boolean {
  const a = Buffer.from(pw); const b = Buffer.from(expectedPassword());
  return a.length === b.length && timingSafeEqual(a, b);
}
export function makeSessionCookie(): { name: string; value: string; maxAge: number } {
  const nonce = randomBytes(12).toString('hex');
  const exp = Date.now() + 12 * 3600 * 1000;
  const payload = `${nonce}.${exp}`;
  return { name: COOKIE, value: `${payload}.${sign(payload)}`, maxAge: 12 * 3600 };
}
export function isAdmin(): boolean {
  const v = cookies().get(COOKIE)?.value;
  if (!v) return false;
  const [nonce, exp, sig] = v.split('.');
  if (!nonce || !exp || !sig) return false;
  const good = sign(`${nonce}.${exp}`);
  if (sig.length !== good.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return false;
  return Number(exp) > Date.now();
}
export const ADMIN_COOKIE = COOKIE;
