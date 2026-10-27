'use client';
import { useState } from 'react';
import { COMPANY, LOGO_SRC } from '@/lib/brand';

/** Company logo; renders nothing if the image file is missing so pages never show a broken icon. */
export default function Logo({ height = 28 }: { height?: number }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={LOGO_SRC} alt={COMPANY} height={height} style={{ height, width: 'auto', display: 'block', background: '#fff', padding: '3px 8px', borderRadius: 6, boxSizing: 'content-box' }} onError={() => setOk(false)} />;
}
