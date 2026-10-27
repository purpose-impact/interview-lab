import Link from 'next/link';
import { LogoutButton } from './AdminBits';
import Logo from '../Logo';

export function AdminShell({ children, active }: { children: React.ReactNode; active?: 'dash' | 'candidates' | 'guide' | 'questions' }) {
  return (
    <>
      <div className="topbar">
        <div className="in">
          <span className="brand row"><Logo height={26} />Java Interview Lab · Admin</span>
          <nav className="nav">
            <Link href="/admin" style={active === 'dash' ? { fontWeight: 700 } : undefined}>Dashboard</Link>
            <Link href="/admin/candidates" style={active === 'candidates' ? { fontWeight: 700 } : undefined}>Candidates</Link>
            <Link href="/admin/questions" style={active === 'questions' ? { fontWeight: 700 } : undefined}>Questions</Link>
            <Link href="/admin/guide" style={active === 'guide' ? { fontWeight: 700 } : undefined}>Interviewer guide</Link>
            <a href="/api/admin/export">Export CSV</a>
            <Link href="/" target="_blank">Candidate link ↗</Link>
            <LogoutButton />
          </nav>
        </div>
      </div>
      <main className="wrap">{children}</main>
    </>
  );
}

export function pctClass(p: number | null) { return p === null ? '' : p >= 70 ? 'good' : p >= 50 ? 'warn' : 'bad'; }
export function recBadge(rec: string) {
  const c = rec === 'Strong hire' || rec === 'Hire' ? 'b-good' : rec === 'Borderline' ? 'b-warn' : rec === 'No hire' ? 'b-bad' : '';
  return <span className={`badge ${c}`}>{rec}</span>;
}
export function Bar({ pct }: { pct: number | null }) {
  return <div className={`bar ${pctClass(pct)}`} aria-hidden><i style={{ width: `${pct ?? 0}%` }} /></div>;
}
export const fmtDate = (iso?: string) => (iso ? iso.slice(0, 16).replace('T', ' ') + ' UTC' : '-');
