import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Java Interview Lab',
  description: 'Mock technical assessment for Java / Spring Boot engineers',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
