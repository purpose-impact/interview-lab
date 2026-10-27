import { Attempt, Question } from './types';

/**
 * Storage: Upstash Redis REST (Vercel Marketplace / legacy Vercel KV) when configured,
 * otherwise an in-memory Map (fine for local dev; NOT durable on serverless).
 */
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export const storageMode: 'redis' | 'memory' = URL_ && TOKEN ? 'redis' : 'memory';

const g = globalThis as unknown as { __attempts?: Map<string, Attempt> };
const mem = (g.__attempts ??= new Map<string, Attempt>());

async function cmd<T = unknown>(...args: (string | number)[]): Promise<T> {
  const res = await fetch(URL_ as string, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Redis error ${res.status}`);
  const j = (await res.json()) as { result: T; error?: string };
  if (j.error) throw new Error(j.error);
  return j.result;
}

const KEY = (id: string) => `jil:attempt:${id}`;
const INDEX = 'jil:attempts';

export async function saveAttempt(a: Attempt): Promise<void> {
  if (storageMode === 'memory') { mem.set(a.id, a); return; }
  await cmd('SET', KEY(a.id), JSON.stringify(a));
  await cmd('SADD', INDEX, a.id);
}

export async function getAttempt(id: string): Promise<Attempt | null> {
  if (!/^[a-zA-Z0-9_-]{6,64}$/.test(id)) return null;
  if (storageMode === 'memory') return mem.get(id) ?? null;
  const raw = await cmd<string | null>('GET', KEY(id));
  return raw ? (JSON.parse(raw) as Attempt) : null;
}

export async function listAttempts(): Promise<Attempt[]> {
  if (storageMode === 'memory') return [...mem.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const ids = await cmd<string[]>('SMEMBERS', INDEX);
  if (!ids.length) return [];
  const raws = await cmd<(string | null)[]>('MGET', ...ids.map(KEY));
  return raws.filter((r): r is string => !!r).map((r) => JSON.parse(r) as Attempt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteAttempt(id: string): Promise<void> {
  if (storageMode === 'memory') { mem.delete(id); return; }
  await cmd('DEL', KEY(id));
  await cmd('SREM', INDEX, id);
}

/** Admin edits layered over the built-in question bank. */
export interface Overlay {
  /** added questions, and edited copies of built-ins (same id) */
  custom: Record<string, Question>;
  /** ids removed from new papers; kept so existing attempts still resolve */
  retired: string[];
}
const OVERLAY_KEY = 'jil:overlay';
const go = globalThis as unknown as { __overlay?: Overlay };

export async function getOverlay(): Promise<Overlay> {
  if (storageMode === 'memory') return (go.__overlay ??= { custom: {}, retired: [] });
  const raw = await cmd<string | null>('GET', OVERLAY_KEY);
  const o = raw ? (JSON.parse(raw) as Partial<Overlay>) : {};
  return { custom: o.custom ?? {}, retired: o.retired ?? [] };
}

export async function saveOverlay(o: Overlay): Promise<void> {
  if (storageMode === 'memory') { go.__overlay = o; return; }
  await cmd('SET', OVERLAY_KEY, JSON.stringify(o));
}
