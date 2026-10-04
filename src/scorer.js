import { BANDS } from './rules.js';

const LABELS = { 100: 'Well done', 80: 'Generally', 0: 'Not at all' };

/** score(result) -> { counts, rubricIssues, band, label }. Counts problem *sentences* for past/future/long. */
export function score(result) {
  const count = (type) => result.issues.filter((i) => i.type === type).length;
  const uniq = (types, sev) => new Set(result.issues
    .filter((i) => types.includes(i.type) && (!sev || i.severity === sev) && i.sid !== undefined)
    .map((i) => i.sid)).size;
  const counts = {
    past: uniq(['past']),
    future: uniq(['future']),
    longSentence: uniq(['longSentence'], 'error'),
    longParagraph: count('longParagraph'),
    noise: count('noise'),
    passive: count('passive'),
    latinate: count('latinate'),
    ambiguousRef: count('ambiguousRef'),
    grammar: count('grammar'),
    heading: count('heading'),
  };
  // A sentence that is both long and past/future counts once.
  const longErrors = new Set(result.issues.filter((i) => i.type === 'longSentence' && i.severity === 'error').map((i) => i.sid));
  const pf = new Set(result.issues.filter((i) => ['past', 'future'].includes(i.type)).map((i) => i.sid));
  const merged = new Set([...longErrors, ...pf]).size;
  const rubricIssues = merged + counts.longParagraph;
  const band = rubricIssues <= BANDS.full ? 100 : rubricIssues <= BANDS.partial ? 80 : 0;
  return { counts, rubricIssues, band, label: LABELS[band] };
}
