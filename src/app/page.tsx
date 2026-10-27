import StartForm from './StartForm';
import Logo from './Logo';
import { LEVELS } from '@/lib/categories';

export const dynamic = 'force-dynamic';

export default function Home() {
  const gated = !!process.env.TEST_ACCESS_CODE;
  const levels = Object.entries(LEVELS).map(([id, l]) => ({ id, label: l.label, minutes: l.minutes }));
  return (
    <main className="wrap narrow">
      <div style={{ marginBottom: 18 }}><Logo height={40} /></div>
      <h1>Java Engineering Assessment</h1>
      <p className="muted">
        A timed technical assessment covering core Java, concurrency, JVM &amp; debugging, SQL, Spring Boot, APIs, reporting,
        deployment, hands-on coding and your project experience.
      </p>
      <div className="panel">
        <h2>Before you start</h2>
        <ul className="tight">
          <li>Choose the experience band that matches you. The timer starts as soon as you press <b>Start</b> and cannot be paused.</li>
          <li>Your answers are saved automatically; if your browser closes, reopen the same test link to continue.</li>
          <li>Coding answers are typed in the browser - no IDE needed. Clear, correct logic matters more than perfect syntax.</li>
          <li>Do not use external help or AI tools. Tab switches and pastes are recorded for the reviewer.</li>
        </ul>
      </div>
      <StartForm levels={levels} gated={gated} />
    </main>
  );
}
