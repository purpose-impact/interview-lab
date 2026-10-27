import { Attempt } from "@/lib/types";
import { isAdmin } from '@/lib/auth';
import { getAttempt, listAttempts } from '@/lib/store';
import { loadBank } from '@/lib/bank';
import { candidateKey } from '@/lib/candidates';
import { buildReport, reportFileName, reportToMarkdown } from '@/lib/report';

export const dynamic = 'force-dynamic';

/** GET ?attempt=<id> (one test) or ?candidate=<email> (all tests, with combined profile) -> Markdown download. */
export async function GET(req: Request) {
  if (!isAdmin()) return new Response('Unauthorized', { status: 401 });
  const url = new URL(req.url);
  const attemptId = url.searchParams.get('attempt');
  const candidate = url.searchParams.get('candidate');

  let attempts: Attempt[] = [];
  if (attemptId) {
    const a = await getAttempt(attemptId);
    if (a) attempts = [a];
  } else if (candidate) {
    const key = candidateKey(candidate);
    attempts = (await listAttempts()).filter((a) => candidateKey(a.email) === key);
  }
  if (attempts.length === 0) return new Response('Not found', { status: 404 });

  const report = buildReport(attempts, await loadBank());
  return new Response(reportToMarkdown(report), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${reportFileName(report, 'md')}"`,
    },
  });
}
