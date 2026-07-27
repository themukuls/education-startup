// A small CBSE Class 10 Maths syllabus corpus so retrieval has something to
// ground on out of the box. Real deployments ingest full syllabus/textbook/
// question-bank material via POST /api/rag/ingest.

import type { Store } from '../db/store.ts'
import { credsFromEnv } from '../llm/index.ts'
import { ingest, type RawDoc } from './index.ts'

export const DEMO_CORPUS: RawDoc[] = [
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Quadratics', source: 'NCERT Ch.4', content: 'A quadratic equation in x is of the form ax^2 + bx + c = 0, where a, b, c are real numbers and a is not 0. Its roots are the values of x that satisfy the equation.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Quadratics', source: 'NCERT Ch.4', content: 'Solving quadratic equations by factorisation: split the middle term into two terms whose product is a·c and whose sum is b, then set each factor to zero.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Quadratics', source: 'NCERT Ch.4', content: 'The quadratic formula gives the roots x = (-b ± sqrt(b^2 - 4ac)) / (2a). The discriminant D = b^2 - 4ac decides the nature of roots: D>0 two distinct real roots, D=0 equal real roots, D<0 no real roots.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Quadratics', source: 'NCERT Ch.4', content: 'Word problems: translate a real situation (areas, speed-distance-time, ages, consecutive numbers) into a quadratic equation by choosing a variable, forming the equation, and solving it.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Real Numbers', source: 'NCERT Ch.1', content: 'The Fundamental Theorem of Arithmetic: every composite number can be expressed as a product of primes, uniquely apart from order. Used to find HCF and LCM of two numbers.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Polynomials', source: 'NCERT Ch.2', content: 'For a quadratic polynomial ax^2 + bx + c, the sum of zeroes is -b/a and the product of zeroes is c/a. The zeroes are the x-coordinates where the graph meets the x-axis.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Linear Equations', source: 'NCERT Ch.3', content: 'A pair of linear equations in two variables can be solved by substitution, elimination, or cross-multiplication. Graphically, solutions are the intersection of two straight lines.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Triangles', source: 'NCERT Ch.6', content: 'Similar triangles have equal corresponding angles and proportional corresponding sides. Basic Proportionality Theorem (Thales): a line parallel to one side divides the other two sides in the same ratio.' },
]

/** Seed the demo corpus once, if the corpus is empty. */
export async function seedCorpusIfEmpty(store: Store): Promise<void> {
  if ((await store.countChunks()) > 0) return
  try {
    const n = await ingest(store, DEMO_CORPUS, credsFromEnv())
    console.log(`[rag] seeded ${n} demo syllabus chunks`)
  } catch (err) {
    console.warn('[rag] corpus seed skipped:', err)
  }
}
