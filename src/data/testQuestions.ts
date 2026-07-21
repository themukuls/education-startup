// Static fallback bank for the free Board Readiness Audit — used when the
// generation backend is unavailable (offline, no API key, or a failed call).
// Class 10 CBSE · Maths · Quadratic Equations, tagged R/U/A (recall / understand
// / apply) — the distinction the Diagnosis Engine reports on.

import type { Question, CogLevel } from '../shared/quiz'

export type { Question }
/** Legacy alias kept for callers that imported `Skill`. */
export type Skill = CogLevel

export const auditQuestions: Question[] = [
  {
    id: 1,
    subject: 'Maths',
    topic: 'Quadratics',
    skill: 'R',
    prompt: 'Which of these is a quadratic equation?',
    hint: 'Highest power of x must be 2.',
    options: ['2x + 5 = 0', 'x² − 7x + 12 = 0', 'x³ − 1 = 0', '5/x = 2'],
    answer: 1,
  },
  {
    id: 2,
    subject: 'Maths',
    topic: 'Quadratics',
    skill: 'R',
    prompt: 'The quadratic formula for ax² + bx + c = 0 is x =',
    options: [
      '(−b ± √(b² − 4ac)) / 2a',
      '(−b ± √(b² + 4ac)) / 2a',
      '(b ± √(b² − 4ac)) / a',
      '(−b ± √(4ac − b²)) / 2a',
    ],
    answer: 0,
  },
  {
    id: 3,
    subject: 'Maths',
    topic: 'Quadratics',
    skill: 'U',
    prompt: 'For x² − 4x + 4 = 0, the discriminant tells us the roots are…',
    hint: 'Compute b² − 4ac first.',
    options: ['Two distinct real roots', 'Two equal real roots', 'No real roots', 'Cannot be determined'],
    answer: 1,
  },
  {
    id: 4,
    subject: 'Maths',
    topic: 'Quadratics',
    skill: 'A',
    prompt: 'The sum of a number and its reciprocal is 10/3. Which equation represents this?',
    hint: 'Tap the correct option.',
    options: ['x² − 10x + 3 = 0', '3x² − 10x + 3 = 0', 'x² + 3 = 10x', '3x² + 10x + 3 = 0'],
    answer: 1,
  },
  {
    id: 5,
    subject: 'Maths',
    topic: 'Quadratics',
    skill: 'A',
    prompt: 'The roots of x² − 5x + 6 = 0 are',
    options: ['2 and 3', '−2 and −3', '1 and 6', '−1 and −6'],
    answer: 0,
  },
  {
    id: 6,
    subject: 'Maths',
    topic: 'Quadratics',
    skill: 'U',
    prompt: 'If one root of x² + kx + 12 = 0 is 3, the value of k is',
    hint: 'A root makes the equation equal 0.',
    options: ['−7', '7', '−4', '4'],
    answer: 0,
  },
  {
    id: 7,
    subject: 'Maths',
    topic: 'Quadratics',
    skill: 'A',
    prompt:
      'A rectangular plot has area 528 m². Its length is one more than twice its breadth. If breadth = x, the equation is',
    hint: 'Length × breadth = area.',
    options: ['2x² + x − 528 = 0', 'x² + 2x − 528 = 0', '2x² − x − 528 = 0', 'x² − 2x + 528 = 0'],
    answer: 0,
  },
  {
    id: 8,
    subject: 'Maths',
    topic: 'Quadratics',
    skill: 'R',
    prompt: 'A quadratic equation has at most how many real roots?',
    options: ['1', '2', '3', 'Infinite'],
    answer: 1,
  },
  {
    id: 9,
    subject: 'Maths',
    topic: 'Quadratics',
    skill: 'U',
    prompt: 'Completing the square on x² + 6x + 5 gives',
    options: ['(x + 3)² − 4', '(x + 3)² + 4', '(x + 6)² − 31', '(x + 5)² − 20'],
    answer: 0,
  },
]
