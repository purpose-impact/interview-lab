import { isAdmin } from '@/lib/auth';
import { listAttempts } from '@/lib/store';
import { loadBank } from '@/lib/bank';
import { evaluate } from '@/lib/scoring';
import { CAT_ORDER, CATS, LEVELS } from '@/lib/categories';

export const dynamic = 'force-dynamic';

const esc = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export async function GET() {
  if (!isAdmin()) return new Response('Unauthorized', { status: 401 });
  const rows = await listAttempts();
  const bank = await loadBank();
  const head = ['Name', 'Email', 'Level', 'Started (UTC)', 'Submitted (UTC)', 'Minutes taken', 'Objective %', 'Overall %', 'Recommendation', 'Interviewer decision', 'Pending reviews', 'Tab switches', 'Pastes',
    ...CAT_ORDER.map((c) => `${CATS[c].short} %`)];
  const lines = [head.map(esc).join(',')];
  for (const a of rows) {
    const e = evaluate(a, bank);
    const mins = a.submittedAt ? Math.round((new Date(a.submittedAt).getTime() - new Date(a.createdAt).getTime()) / 60000) : '';
    lines.push([
      a.name, a.email, LEVELS[a.level].label, a.createdAt, a.submittedAt ?? '', mins,
      e.objective.pct?.toFixed(1) ?? '', e.overall?.toFixed(1) ?? '', a.submittedAt ? e.recommendation : 'In progress',
      a.review.decision ?? '', e.pendingCount, a.flags.blur, a.flags.paste,
      ...CAT_ORDER.map((c) => e.cats[c].pct?.toFixed(1) ?? ''),
    ].map(esc).join(','));
  }
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="interview-results.csv"' } });
}
