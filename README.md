# Java Interview Lab

A mini assessment app for interviewing Java / Spring Boot engineers (5-15 years). Built with Next.js 14 so it deploys to **Vercel** in a few clicks.

**Candidate side** - enter details, pick a level (Mid 60 min / Senior 75 min / Lead 90 min), take a timed test: auto-graded multiple choice (core Java, concurrency, JVM/debugging, SQL, modern Java, Spring Boot, APIs, reporting, deployment), hands-on coding, debugging cases and a project walkthrough. Autosave, timer, auto-submit, per-candidate option shuffling; answers never leave the server.

**Interviewer side (`/admin`)** - performance dashboard (averages by skill area, recommendation mix, ranked candidate table), per-candidate review (radar chart, area scores, MCQ breakdown with explanations, score written/code answers 0-5 with "what a strong answer covers", live-interview ratings, final decision), CSV export and an **Interviewer guide** (`/admin/guide`) with live questions, follow-ups, strong signals and red flags.

## Deploy to Vercel
1. Push this folder to a GitHub repo, then in Vercel choose **Add New → Project → Import** (framework auto-detected as Next.js). Or run `npx vercel` from this folder.
2. **Storage (needed for real use):** Project → *Storage* / *Marketplace* → add **Upstash Redis**, connect it to the project. It injects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (legacy `KV_REST_API_*` also works). Without it, data is kept in memory and will be lost.
3. Project → *Settings → Environment Variables*:
   - `ADMIN_PASSWORD` - interviewer login (required)
   - `AUTH_SECRET` - any long random string (recommended)
   - `TEST_ACCESS_CODE` - optional code candidates must enter
4. Redeploy. Share the root URL with candidates; open `/admin` yourself.

## Run locally
```
npm install
npm run dev     # http://localhost:3000  (admin password defaults to "admin" in dev only)
```

## Customising
- Questions: `src/lib/questions/*.ts` (`mc` = single choice, `ms` = multi-select, `tx` = written/code with a keyword rubric). `d` = difficulty 1-3 (Mid draws 1-2, Senior/Lead 2-3).
- Test composition, durations and area weights: `src/lib/categories.ts` (weights default to your priority table: concurrency/core/debugging heaviest).
- Live-interview questions: `src/lib/guide.ts`.

## Scoring notes
Choice questions are auto-graded. Written/code answers get a keyword-coverage *suggestion*; they show as "pending" until the interviewer scores them 0-5, and the interviewer's score always wins. Overall = weighted average of area scores; thresholds: ≥78 Strong hire, ≥65 Hire, ≥50 Borderline. Tab-switch and paste counts are shown as integrity signals only. Code is not executed (Vercel cannot run a JVM) - review it by reading.
