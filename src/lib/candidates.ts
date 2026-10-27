import { Attempt } from './types';

/** Tests taken with the same email (case-insensitive) belong to the same candidate. */
export const candidateKey = (email: string) => email.trim().toLowerCase();

export interface CandidateGroup { key: string; name: string; email: string; attempts: Attempt[] }

/** Groups attempts per candidate; attempts inside a group are oldest-first, groups are most-recently-active first. */
export function groupCandidates(all: Attempt[]): CandidateGroup[] {
  const map = new Map<string, Attempt[]>();
  for (const a of all) {
    const k = candidateKey(a.email);
    map.set(k, [...(map.get(k) ?? []), a]);
  }
  return [...map.entries()].map(([key, attempts]) => {
    attempts.sort((x, y) => x.createdAt.localeCompare(y.createdAt));
    const latest = attempts[attempts.length - 1];
    return { key, name: latest.name, email: latest.email, attempts };
  }).sort((x, y) => y.attempts[y.attempts.length - 1].createdAt.localeCompare(x.attempts[x.attempts.length - 1].createdAt));
}
