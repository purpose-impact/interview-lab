import { ChoiceQ, Question, TextQ, isChoice } from '../types';
import { CORE } from './core';
import { CONC } from './conc';
import { JVM } from './jvm';
import { SQL } from './sql';
import { MODERN } from './modern';
import { SPRING } from './spring';
import { API } from './apiq';
import { REPORT } from './report';
import { DEPLOY } from './deploy';
import { HANDSON } from './handson';
import { MINDSET } from './mindset';
import { WRITTEN } from './written';

export const MCQ_BANK: ChoiceQ[] = [...CORE, ...CONC, ...JVM, ...SQL, ...MODERN, ...SPRING, ...API, ...REPORT, ...DEPLOY, ...MINDSET].filter(isChoice);

export const HANDS_ON_BANK: TextQ[] = HANDSON;

export const ALL_QUESTIONS: Question[] = [...MCQ_BANK, ...HANDSON, ...WRITTEN, ...MINDSET.filter((q) => !isChoice(q))];

export const Q_BY_ID: Record<string, Question> = Object.fromEntries(ALL_QUESTIONS.map((q) => [q.id, q]));
