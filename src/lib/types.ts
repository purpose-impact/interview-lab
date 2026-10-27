export type Level = 'mid' | 'senior' | 'lead';
export type CatId =
  | 'core' | 'conc' | 'jvm' | 'sql' | 'modern' | 'spring'
  | 'api' | 'report' | 'deploy' | 'handson' | 'project' | 'mindset';

interface BaseQ {
  id: string;
  cat: CatId;
  /** 1 = foundation (mid), 2 = senior, 3 = lead / architect depth */
  d: 1 | 2 | 3;
  q: string;
  code?: string;
  /** Written/code questions outside the hands-on pool: levels whose paper always includes this question */
  levels?: Level[];
}
export interface ChoiceQ extends BaseQ {
  type: 'mcq' | 'multi';
  opts: string[];
  ans: number[];
  why: string;
}
export interface TextQ extends BaseQ {
  type: 'text' | 'code';
  starter?: string;
  /** What a strong answer contains - shown to the interviewer only */
  lookFor: string[];
  /** Keyword groups (any-of) used to *suggest* a score; interviewer has the final say */
  rubric: string[][];
}
export type Question = ChoiceQ | TextQ;

export type PublicQuestion =
  | Omit<ChoiceQ, 'ans' | 'why'>
  | Omit<TextQ, 'lookFor' | 'rubric'>;

export type AnswerValue = number[] | string;

export interface Review {
  scores: Record<string, number>; // per text question, 0..5
  notes: Record<string, string>;
  live: Record<string, number>; // live interview ratings 0..5
  liveNotes: string;
  decision?: 'strong_hire' | 'hire' | 'borderline' | 'no_hire' | '';
  reviewer?: string;
  reviewedAt?: string;
}

export interface Attempt {
  id: string;
  name: string;
  email: string;
  level: Level;
  yearsExp?: string;
  createdAt: string;
  deadline: string;
  submittedAt?: string;
  qids: string[];
  /** per-question option order: perm[displayIndex] = originalIndex (choice questions only) */
  perm: Record<string, number[]>;
  answers: Record<string, AnswerValue>;
  flags: { blur: number; paste: number };
  review: Review;
}

export const isChoice = (q: Question): q is ChoiceQ => q.type === 'mcq' || q.type === 'multi';
