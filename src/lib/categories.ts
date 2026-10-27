import { CatId, Level } from './types';

export const CATS: Record<CatId, { label: string; short: string; weight: number }> = {
  core:    { label: 'Core Java, Collections & OOD',        short: 'Core Java',   weight: 15 },
  conc:    { label: 'Concurrency & Java Memory Model',     short: 'Concurrency', weight: 15 },
  jvm:     { label: 'JVM, Debugging & Production',         short: 'JVM / Debug', weight: 12 },
  sql:     { label: 'SQL, JPA & Data Access',              short: 'SQL / Data',  weight: 10 },
  modern:  { label: 'Modern Java, Generics & Patterns',    short: 'Modern Java', weight: 8 },
  spring:  { label: 'Spring Boot',                         short: 'Spring Boot', weight: 10 },
  api:     { label: 'API Design & Integration',            short: 'APIs',        weight: 6 },
  report:  { label: 'Reporting & Templating',              short: 'Reporting',   weight: 3 },
  deploy:  { label: 'Deployment, CI/CD & Observability',   short: 'Deployment',  weight: 6 },
  handson: { label: 'Hands-on Programming',                short: 'Hands-on',    weight: 10 },
  project: { label: 'Project Ownership & Communication',   short: 'Project',     weight: 5 },
  mindset: { label: 'Behaviour & Learning Mindset',        short: 'Mindset',     weight: 6 },
};
export const CAT_ORDER = Object.keys(CATS) as CatId[];

export interface LevelConfig {
  label: string;
  minutes: number;
  mcq: Partial<Record<CatId, number>>;
  hands: number;
  /** string = fixed question id, string[] = pick one at random */
  written: (string | string[])[];
}

export const LEVELS: Record<Level, LevelConfig> = {
  mid: {
    label: 'Mid-level (5–8 yrs)',
    minutes: 60,
    mcq: { core: 5, conc: 4, jvm: 3, sql: 3, modern: 3, spring: 4, api: 2, report: 1, deploy: 2, mindset: 3 },
    hands: 2,
    written: ['W_PROJECT', ['D_SLOW', 'D_MEMORY'], ['M_LEARN', 'M_MISTAKE']],
  },
  senior: {
    label: 'Senior (8–12 yrs)',
    minutes: 75,
    mcq: { core: 5, conc: 5, jvm: 4, sql: 4, modern: 3, spring: 4, api: 3, report: 1, deploy: 2, mindset: 3 },
    hands: 2,
    written: ['W_PROJECT', 'W_INCIDENT', ['D_THREADS', 'D_MEMORY', 'D_SLOW'], ['W_API', 'W_DEPLOY', 'W_REPORT'], ['M_FEEDBACK', 'M_MISTAKE', 'M_LEARN']],
  },
  lead: {
    label: 'Lead / Architect (12–15 yrs)',
    minutes: 90,
    mcq: { core: 5, conc: 5, jvm: 4, sql: 4, modern: 3, spring: 4, api: 2, report: 1, deploy: 2, mindset: 3 },
    hands: 2,
    written: ['W_PROJECT', 'W_CONC', 'W_TRADEOFF', ['D_THREADS', 'D_MEMORY', 'D_SLOW'], ['W_API', 'W_DEPLOY', 'W_REPORT'], ['M_FEEDBACK', 'M_MISTAKE']],
  },
};

export const DECISIONS = {
  strong_hire: 'Strong hire',
  hire: 'Hire',
  borderline: 'Borderline',
  no_hire: 'No hire',
} as const;

export const LIVE_DIMENSIONS: { id: string; label: string; hint: string }[] = [
  { id: 'project', label: 'Explains current project clearly', hint: 'Domain, architecture, own contribution, measurable impact' },
  { id: 'ownership', label: 'Production ownership', hint: 'Incidents handled, RCA, prevention, on-call maturity' },
  { id: 'debug', label: 'Debugging approach', hint: 'Hypothesis-driven, evidence first (dumps, logs, metrics)' },
  { id: 'design', label: 'Design reasoning & trade-offs', hint: 'Why this over that; knows limits of own design' },
  { id: 'comm', label: 'Communication', hint: 'Concise, structured, honest about gaps' },
];
