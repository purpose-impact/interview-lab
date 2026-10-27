/** Small dependency-free SVG radar chart. values are 0..100 or null. */
export default function Radar({ labels, values, size = 340 }: { labels: string[]; values: (number | null)[]; size?: number }) {
  const n = labels.length, c = size / 2, R = size / 2 - 58;
  const pt = (i: number, r: number) => { const a = (Math.PI * 2 * i) / n - Math.PI / 2; return [c + r * Math.cos(a), c + r * Math.sin(a)] as const; };
  const ring = (p: number) => labels.map((_, i) => pt(i, (R * p) / 100).join(',')).join(' ');
  const poly = values.map((v, i) => pt(i, (R * (v ?? 0)) / 100).join(',')).join(' ');
  return (
    <svg viewBox={`-70 0 ${size + 140} ${size}`} width="100%" style={{ maxWidth: size + 140 }} role="img" aria-label="Skill profile radar chart">
      {[25, 50, 75, 100].map((p) => <polygon key={p} points={ring(p)} fill="none" stroke="var(--line)" strokeWidth={1} />)}
      {labels.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--line)" />; })}
      <polygon points={poly} fill="var(--brand)" fillOpacity={0.22} stroke="var(--brand)" strokeWidth={2} />
      {values.map((v, i) => { const [x, y] = pt(i, (R * (v ?? 0)) / 100); return <circle key={i} cx={x} cy={y} r={3.5} fill="var(--brand)" />; })}
      {labels.map((l, i) => {
        const [x, y] = pt(i, R + 16);
        const anchor = x < c - 6 ? 'end' : x > c + 6 ? 'start' : 'middle';
        return <text key={l} x={x} y={y} fontSize={11} fill="var(--muted)" textAnchor={anchor} dominantBaseline="middle">{l}{values[i] !== null ? ` ${Math.round(values[i] as number)}%` : ''}</text>;
      })}
    </svg>
  );
}
