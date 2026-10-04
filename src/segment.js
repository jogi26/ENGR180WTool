import { ABBREVIATIONS, LIMITS } from './rules.js';

export const WORD_RE = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g;

export function countWords(s) {
  const m = s.match(WORD_RE);
  return m ? m.length : 0;
}

function isHeading(line) {
  const words = countWords(line);
  return words > 0 && words <= LIMITS.headingMaxWords && !/[.!?:;,]["')”’]*$/.test(line) && /^[A-Z0-9]/.test(line);
}

// Split one line into sentences, returning offsets relative to the line.
const nextRe = /\s*(\S)/y;

function splitSentences(line) {
  const ends = [];
  const re = /[.!?]+["')\]”’]*(?=\s|$)/g;
  let m;
  while ((m = re.exec(line))) {
    const end = m.index + m[0].length;
    let ts = m.index;
    while (ts > 0 && !/\s/.test(line[ts - 1])) ts--;
    const token = line.slice(ts, m.index).replace(/^["'(“‘]+/, '');
    if (m[0][0] === '.' && (ABBREVIATIONS.has(token.toLowerCase()) || /^[A-Z]$/.test(token))) continue;
    nextRe.lastIndex = end;
    const next = nextRe.exec(line);
    if (next && /[a-z]/.test(next[1])) continue; // lowercase continues the sentence
    ends.push(end);
  }
  if (!ends.length || ends[ends.length - 1] < line.trimEnd().length) ends.push(line.trimEnd().length);
  const out = [];
  let from = 0;
  for (const end of ends) {
    const raw = line.slice(from, end);
    const lead = raw.length - raw.trimStart().length;
    const start = from + lead;
    if (end > start) out.push({ start, end });
    from = end;
  }
  return out;
}

/** segment(text) -> { paragraphs: [{ start, end, isHeading, sentences: [{ start, end, text, words }] }] } */
export function segment(text) {
  const paragraphs = [];
  const lineRe = /[^\n]+/g;
  let m;
  while ((m = lineRe.exec(text))) {
    const rawLine = m[0];
    const line = rawLine.trim();
    if (!line) continue;
    const base = m.index + (rawLine.length - rawLine.trimStart().length);
    const para = { start: base, end: base + line.length, isHeading: isHeading(line), hasYear: /\b(?:19|20)\d\d\b/.test(line), sentences: [] };
    if (!para.isHeading) {
      for (const s of splitSentences(line)) {
        const st = base + s.start;
        const en = base + s.end;
        const t = text.slice(st, en);
        para.sentences.push({ start: st, end: en, text: t, words: countWords(t) });
      }
    }
    paragraphs.push(para);
  }
  return { paragraphs };
}
