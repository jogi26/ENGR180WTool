// Small deterministic grammar rules for patterns the Harper engine misses.
// Pure: takes the paragraphs from segment() and returns issues of type "grammar".

const PLURAL_QTY = '(?:quite a few|a few|few|many|several|numerous|two|three|four|five|six|seven|eight|nine|ten)';
const THERE_RX = new RegExp(`\\b(there)\\s+(is|was)\\s+${PLURAL_QTY}\\b`, 'gi');
const VERBS = ['force', 'make', 'help', 'allow', 'let', 'give', 'show', 'mean', 'cause', 'take', 'need', 'want',
  'create', 'lead', 'bring', 'keep', 'require', 'offer', 'provide', 'enable', 'get', 'put', 'find', 'tell'];
const S_FORM = (v) => (/(?:s|x|ch|sh)$/.test(v) ? `${v}es` : `${v}s`);
const BASE_RX = new RegExp(`\\b(this|that|it|he|she)\\s+(${VERBS.join('|')})\\s+(?=me\\b|us\\b|you\\b|them\\b|him\\b|her\\b|the\\b|a\\b|an\\b|my\\b|our\\b|your\\b|their\\b|to\\b|all\\b|both\\b|more\\b|less\\b)`, 'gi');
const SFORMS = VERBS.map(S_FORM);
const BASE_OF = new Map(VERBS.map((v) => [S_FORM(v), v]));
const PLURAL_SUBJ_RX = new RegExp(`\\b(I|we|you|they)\\s+(${SFORMS.join('|')})\\b`, 'gi');
const FRAGMENT_START = /^(being|having|getting|using|working|making|taking|going|trying|learning)\b/i;
const AUX = new Set(['is', 'are', 'was', 'were', 'be', 'can', 'could', 'will', 'would', 'should', 'may', 'might', 'must',
  'has', 'have', 'had', 'do', 'does', 'did', 'ran', 'got', 'went', 'took', 'made', 'came', 'saw', 'left', 'said']);
const PRONOUN_VERB_RX = /\b(?:i|we|you|they|it|he|she)\s+[a-z]+/i;

function finiteCandidate(words, sentence) {
  if (PRONOUN_VERB_RX.test(sentence)) return true;
  return words.slice(1).some((w) => {
    const l = w.toLowerCase();
    return AUX.has(l) || (l.length > 3 && /[^su]s$/.test(l) && !l.endsWith('ss')) || (l.length > 4 && l.endsWith('ed'));
  });
}

export function grammarRules(paragraphs) {
  const out = [];
  for (const p of paragraphs) {
    for (const s of p.sentences) {
      const t = s.text.replace(/[’‘]/g, "'");
      const add = (m, group, message, fix) => {
        const off = m.index + m[0].indexOf(m[group], group === 2 ? m[1].length : 0);
        out.push({ type: 'grammar', severity: 'warn', start: s.start + off, end: s.start + off + m[group].length,
          message, fix, replace: true });
      };
      for (const m of t.matchAll(THERE_RX)) {
        add(m, 2, `Agreement: "${m[0]}" uses a plural, so use the plural verb.`, m[2].toLowerCase() === 'is' ? 'are' : 'were');
      }
      for (const m of t.matchAll(BASE_RX)) {
        add(m, 2, `Agreement: "${m[1]}" is singular, so the verb needs an -s.`, S_FORM(m[2].toLowerCase()));
      }
      for (const m of t.matchAll(PLURAL_SUBJ_RX)) {
        add(m, 2, `Agreement: "${m[1]}" takes the base form of the verb.`, BASE_OF.get(m[2].toLowerCase()));
      }
      const words = t.match(/[A-Za-z']+/g) || [];
      if (FRAGMENT_START.test(t) && words.length >= 4 && !finiteCandidate(words, t)) {
        out.push({ type: 'grammar', severity: 'warn', start: s.start, end: s.end,
          message: 'Possible sentence fragment: it starts with an -ing phrase but has no main verb.',
          fix: 'Add a subject and verb, or join it to the sentence before it.' });
      }
    }
  }
  return out;
}
