import { ChoiceQ, Question, TextQ, isChoice } from './types';
import { LEVELS } from './categories';
import { ALL_QUESTIONS } from './questions';
import { Overlay, getOverlay } from './store';

export interface Bank {
  /** every known question (including retired ones, so old attempts still resolve) */
  byId: Record<string, Question>;
  /** questions eligible for new papers */
  mcq: ChoiceQ[];
  hands: TextQ[];
  /** admin-added written questions that are always included for the levels they name */
  extraWritten: TextQ[];
  retired: Set<string>;
  builtinIds: Set<string>;
  overlay: Overlay;
}

const FIXED_WRITTEN = new Set(Object.values(LEVELS).flatMap((l) => l.written.flat()));

export function makeBank(overlay: Overlay): Bank {
  const byId: Record<string, Question> = {};
  for (const q of ALL_QUESTIONS) byId[q.id] = q;
  for (const q of Object.values(overlay.custom)) byId[q.id] = q;
  const retired = new Set(overlay.retired);
  const live = Object.values(byId).filter((q) => !retired.has(q.id));
  return {
    byId,
    mcq: live.filter(isChoice),
    hands: live.filter((q): q is TextQ => !isChoice(q) && q.cat === 'handson'),
    extraWritten: live.filter((q): q is TextQ => !isChoice(q) && q.cat !== 'handson' && !FIXED_WRITTEN.has(q.id)),
    retired,
    builtinIds: new Set(ALL_QUESTIONS.map((q) => q.id)),
    overlay,
  };
}

export async function loadBank(): Promise<Bank> {
  return makeBank(await getOverlay());
}
