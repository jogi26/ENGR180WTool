import {
  NOISE, FUTURE, LATINATES, IRREGULAR_PAST, IRREGULAR_PARTICIPLES, NON_VERB_ED, ADJECTIVE_ED, VAGUE_NEXT, LIMITS,
} from './rules.js';
import { segment, countWords, WORD_RE } from './segment.js';
import { grammarRules } from './grammar.js';

const NOISE_RES = NOISE.map((n) => ({ ...n, rx: new RegExp(`\\b(?:${n.re})\\b`, 'gi') }));
const FUTURE_RES = FUTURE.map((f) => ({ ...f, rx: new RegExp(`\\b(?:${f.re})(?![\\w'])`, 'gi') }));
const LATINATE_RX = new RegExp(`\\b(${Object.keys(LATINATES).join('|')})(?:s|d|ed|ing)?\\b`, 'gi');
const PASSIVE_RX = /\b(?:am|is|are|was|were|be|been|being)\s+(?:\w+ly\s+)?([a-z]+)\b(?:\s+by\b)?/gi;
const IRREG_PAST = new Set(IRREGULAR_PAST);
const IRREG_PART = new Set(IRREGULAR_PARTICIPLES);
const PRESENT_AUX = new Set(['is', 'are', 'am', 'be', 'been', 'being', 'has', 'have', "'s"]);
const DETERMINERS = new Set([
  'a', 'an', 'the', 'this', 'these', 'those', 'my', 'our', 'your', 'their', 'its', 'his', 'her',
  'some', 'any', 'each', 'every', 'many', 'more', 'most', 'other', 'of', 'and',
]);

const looksEd = (w) => w.length >= 5 && w.endsWith('ed') && !w.endsWith('eed');

function* matches(rx, s) {
  rx.lastIndex = 0;
  let m;
  while ((m = rx.exec(s))) {
    if (m[0] === '') { rx.lastIndex++; continue; }
    yield m;
  }
}

function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  let n = (w.match(/[aeiouy]+/g) || []).length;
  if (w.endsWith('e') && !w.endsWith('le') && n > 1) n--;
  return Math.max(1, n);
}

const hIssue = (p, severity, message, fix) => ({ type: 'heading', severity, start: p.start, end: p.end, message, fix });

// Headings and the document header block (name/course/instructor/date lines, then the title).
function checkHeadings(paragraphs, body, add) {
  if (body < 3) return;
  let lead = 0;
  while (lead < paragraphs.length && paragraphs[lead].isHeading) lead++;
  const first = paragraphs[0];
  if (lead === 0) {
    add(hIssue(first, 'info', 'No title found at the top. The first short line should be your title.', 'Add a short title line (no end punctuation).'));
  } else {
    const block = paragraphs.slice(0, lead - 1);
    const hasDate = block.some((p) => p.hasYear);
    if (block.length < 2 || !hasDate) {
      add(hIssue(first, 'info', 'Header block: the top of the page usually lists your name, course, instructor and date before the title.', 'Add those lines above the title (check your assignment instructions).'));
    }
  }
  let run = 0, headings = 0;
  for (let i = lead; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    if (p.isHeading) {
      headings++;
      const next = paragraphs[i + 1];
      if (!next || next.isHeading) add(hIssue(p, 'info', 'Heading with no text under it.', 'Add a paragraph under the heading or remove it.'));
      run = 0;
    } else if (++run === 6) {
      add(hIssue(p, 'warn', '6 paragraphs in a row with no heading. The book says to add a heading every 3-5 paragraphs.', 'Add a short heading where the topic shifts.'));
      run = 1;
    }
  }
  const bodyAfter = paragraphs.slice(lead).filter((p) => !p.isHeading).length;
  if (bodyAfter >= 4 && headings / bodyAfter >= 0.75) {
    add(hIssue(paragraphs[lead], 'info', 'A heading on nearly every paragraph slows scanning. The book says three to five paragraphs per heading.', 'Merge sections so each heading covers 3-5 paragraphs.'));
  }
}

export function analyze(text) {
  const { paragraphs } = segment(text);
  const issues = [];
  let sid = 0;
  let totalWords = 0, totalSentences = 0, totalSyll = 0;

  const add = (o) => issues.push(o);

  paragraphs.forEach((p, pid) => {
    if (p.isHeading) return;
    const pWords = p.sentences.reduce((a, s) => a + s.words, 0);

    p.sentences.forEach((s, idx) => {
      const id = sid++;
      totalSentences++;
      totalWords += s.words;
      const norm = s.text.replace(/[’‘]/g, "'");
      const at = (m, len = m[0].length) => ({ start: s.start + m.index, end: s.start + m.index + len, sid: id, pid });
      for (const w of s.text.match(WORD_RE) || []) totalSyll += syllables(w);

      if (s.words > LIMITS.sentenceMax) {
        add({ type: 'longSentence', severity: 'error', start: s.start, end: s.end, sid: id, pid,
          message: `${s.words} words. The book says keep sentences to ${LIMITS.sentenceMax} words or fewer (about 20 is best).`,
          fix: 'Split it into two sentences; make every word count.' });
      } else if (s.words >= LIMITS.sentenceWarn) {
        add({ type: 'longSentence', severity: 'warn', start: s.start, end: s.end, sid: id, pid,
          message: `${s.words} words. Close to the ${LIMITS.sentenceMax}-word limit; about 20 is the sweet spot.`,
          fix: 'Look for words to cut.' });
      }
      if (idx === 0 && s.words > LIMITS.sentenceMax && p.sentences.length > 1) {
        add({ type: 'topicSentence', severity: 'info', start: s.start, end: s.end, sid: id, pid,
          message: 'The topic sentence tells readers what the paragraph is about; keep it short.',
          fix: 'Use one or two short sentences as the topic sentence.' });
      }

      // Table 2.1 phrases + bare future markers; longest match wins on overlap.
      const hits = [];
      for (const n of NOISE_RES) for (const m of matches(n.rx, norm)) hits.push({ m, n });
      for (const f of FUTURE_RES) for (const m of matches(f.rx, norm)) hits.push({ m, n: { ...f, phrase: m[0], tense: 'future' } });
      hits.sort((a, b) => a.m.index - b.m.index || b.m[0].length - a.m[0].length);
      let cursor = -1;
      for (const { m, n } of hits) {
        if (m.index < cursor) continue;
        cursor = m.index + m[0].length;
        if (n.tense === 'future') {
          add({ type: 'future', severity: 'warn', ...at(m),
            message: `Future tense ("${m[0]}"). The book wants present tense; future adds uncertainty about when.`,
            fix: n.fix, replace: !n.fix.startsWith('Delete') });
        } else {
          add({ type: 'noise', severity: 'info', ...at(m),
            message: `Noise phrase "${m[0]}" (Table 2.1).`, fix: n.fix, replace: true });
        }
      }

      for (const m of matches(LATINATE_RX, norm)) {
        const base = m[1].toLowerCase();
        add({ type: 'latinate', severity: 'info', ...at(m),
          message: `"${m[0]}" is a latinate; the book says plain words are easier to understand.`,
          fix: LATINATES[base], replace: true });
      }

      // Past tense (heuristic).
      const wm = [...matches(new RegExp(WORD_RE.source, 'g'), norm)];
      wm.forEach((m, i) => {
        const w = m[0].toLowerCase();
        const prev = i > 0 ? wm[i - 1][0].toLowerCase() : '';
        let past = IRREG_PAST.has(w);
        if (!past && looksEd(w) && !NON_VERB_ED.has(w) && !ADJECTIVE_ED.has(w)) {
          past = !PRESENT_AUX.has(prev) && !DETERMINERS.has(prev) && prev !== 'to';
        }
        if (past) {
          add({ type: 'past', severity: 'warn', ...at(m),
            message: `Possible past tense ("${m[0]}"). The book wants present tense: it puts the action in the now.`,
            fix: 'Rewrite the sentence in present tense (heuristic: ignore if it is not a verb).' });
        }
      });

      // Passive voice.
      for (const m of matches(PASSIVE_RX, norm)) {
        const part = m[1].toLowerCase();
        const ok = IRREG_PART.has(part) || (looksEd(part) && !ADJECTIVE_ED.has(part));
        if (!ok) continue;
        add({ type: 'passive', severity: 'warn', ...at(m),
          message: 'Possible passive voice: it hides who does the action.',
          fix: 'Put the actor first ("The writers won the award"). Exception: customer-facing error messages.' });
      }

      // Vague "It/This".
      const first = wm[0], second = wm[1];
      if (first && /^(this|that|these|those|it|it's)$/i.test(first[0]) &&
          (/^it's$/i.test(first[0]) || (second && VAGUE_NEXT.has(second[0].toLowerCase())))) {
        add({ type: 'ambiguousRef', severity: 'info', ...at(first),
          message: `Sentence starts with "${first[0]}". It is not always clear what that refers to.`,
          fix: 'Repeat the noun instead of "it" or "this".' });
      }
    });

    if (p.sentences.length > LIMITS.paragraphSentences || pWords > LIMITS.paragraphWords) {
      add({ type: 'longParagraph', severity: 'error', start: p.start, end: p.end, pid,
        message: `${p.sentences.length} sentences, ${pWords} words. The book wants 3-5 sentences (about ${LIMITS.paragraphWords} words) per paragraph.`,
        fix: 'Break the paragraph where the topic shifts slightly.' });
    }
  });

  const body = paragraphs.filter((p) => !p.isHeading).length;
  checkHeadings(paragraphs, body, add);

  const grade = totalSentences && totalWords
    ? 0.39 * (totalWords / totalSentences) + 11.8 * (totalSyll / totalWords) - 15.59 : 0;
  issues.push(...grammarRules(paragraphs));
  issues.sort((a, b) => a.start - b.start || a.end - b.end);
  return { issues, paragraphs, stats: { words: totalWords, sentences: totalSentences,
    paragraphs: body, grade: Math.round(grade * 10) / 10 } };
}
export { countWords };
