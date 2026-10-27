import Logo from '../Logo';

export default function Done() {
  return (
    <main className="wrap narrow">
      <div style={{ marginBottom: 18 }}><Logo height={40} /></div>
      <div className="panel">
        <h1>Thank you - your assessment is submitted</h1>
        <p className="muted">The interviewer will review your answers and be in touch. You can close this window.</p>
      </div>
    </main>
  );
}
