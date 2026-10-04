// Data only. Source: Engineering Words, 2nd ed., ch. 2 (Table 2.1 "Phrases to cut from your writing"
// and the clear-writing guidelines). `re` is a regex source matched case-insensitively on word boundaries;
// `<verb>` in a phrase becomes [a-z]+ . `tense: 'future'` entries are reported as future tense.

const v = '[a-z]+';

export const NOISE = [
  { phrase: 'aims to <verb>', re: `aims to ${v}`, fix: '<verb>' },
  { phrase: 'are used to/is used to <verb>', re: `(?:are|is) used to ${v}`, fix: '<verb>' },
  { phrase: 'could <verb>', re: `could ${v}`, fix: '<verb>' },
  { phrase: 'desire', re: 'desire', fix: 'want' },
  { phrase: 'facilitate', re: 'facilitate', fix: 'help or support' },
  { phrase: 'has been', re: 'has been', fix: 'is' },
  { phrase: 'has been <verb>', re: `has been ${v}`, fix: '<verb present tense>' },
  { phrase: 'has finished', re: 'has finished', fix: 'is done or is complete' },
  { phrase: 'has the option of', re: 'has the option of', fix: 'can' },
  { phrase: 'have finished', re: 'have finished', fix: 'are done' },
  { phrase: 'have the ability to <verb>', re: `have the ability to ${v}`, fix: 'can <verb> or <verb>' },
  { phrase: 'have the option to', re: 'have the option to', fix: 'can' },
  { phrase: 'if you want to <verb>', re: `if you want to ${v}`, fix: 'to <verb>' },
  { phrase: 'in order to', re: 'in order to', fix: 'to' },
  { phrase: 'is able to', re: 'is able to', fix: 'can' },
  { phrase: 'is/are designed to <verb>', re: `(?:is|are) designed to ${v}`, fix: '<verb>' },
  { phrase: 'is used to <verb>', re: `is used to ${v}`, fix: '<verb>' },
  { phrase: 'may', re: 'may(?!\\s+\\d)', fix: 'can' },
  { phrase: 'might', re: 'might', fix: 'can' },
  { phrase: 'offers the ability to <verb>', re: `offers the ability to ${v}`, fix: 'lets you <verb>' },
  { phrase: 'once', re: 'once', fix: 'one time or after' },
  { phrase: 'should <verb>', re: `should ${v}`, fix: '<verb>' },
  { phrase: 'since', re: 'since', fix: 'because or after' },
  { phrase: 'utilize', re: 'utili[sz](?:e|es|ed|ing)', fix: 'use' },
  { phrase: 'will also be able to', re: 'will also be able to', fix: 'can also', tense: 'future' },
  { phrase: 'will be <verb>', re: `will be ${v}`, fix: 'is or are <verb> or <verb present tense>', tense: 'future' },
  { phrase: 'will be able to <verb>', re: `will be able to ${v}`, fix: '<verb>', tense: 'future' },
  { phrase: 'will have been', re: 'will have been', fix: 'is or are', tense: 'future' },
  { phrase: 'will have the ability to <verb>', re: `will have the ability to ${v}`, fix: 'can <verb>', tense: 'future' },
  { phrase: 'will have to', re: 'will have to', fix: 'must', tense: 'future' },
  { phrase: 'will have to be', re: 'will have to be', fix: 'must be', tense: 'future' },
  { phrase: 'will then be', re: 'will then be', fix: 'are or is', tense: 'future' },
  { phrase: 'wish', re: 'wish', fix: 'want' },
  { phrase: 'without the need to access', re: 'without the need to access', fix: 'without accessing' },
  { phrase: 'would <verb>', re: `would ${v}`, fix: '<verb>' },
  { phrase: 'would be', re: 'would be', fix: 'are or is' },
  { phrase: 'would like', re: 'would like', fix: 'want' },
];

// Bare future-tense markers (book: search for "will", delete it, fix the verb).
export const FUTURE = [
  { re: "(?:will|won't|shall|[a-z]'ll)", fix: 'Delete "will" and put the verb in present tense (e.g. "The report will print" -> "The report prints").' },
];

// Latinates not already in Table 2.1 (book: "avoid latinates"; utilize/facilitate are in the table).
export const LATINATES = {
  commence: 'start', terminate: 'end', ascertain: 'find out', endeavor: 'try', subsequently: 'later',
  approximately: 'about', sufficient: 'enough', purchase: 'buy', assist: 'help', demonstrate: 'show',
  numerous: 'many', additional: 'more', objective: 'goal',
};

export const IRREGULAR_PAST = [
  'was', 'were', 'had', 'did', 'ran', 'got', 'went', 'took', 'made', 'came', 'saw', 'began', 'wrote',
  'built', 'found', 'gave', 'told', 'thought', 'felt', 'left', 'kept', 'held', 'brought', 'bought',
  'taught', 'lost', 'met', 'sent', 'spent', 'stood', 'understood', 'won', 'chose', 'grew', 'knew',
  'drew', 'drove', 'fell', 'ate', 'sat', 'spoke', 'wore', 'forgot', 'became', 'said', 'led', 'paid', 'sold',
];

export const IRREGULAR_PARTICIPLES = [
  'won', 'done', 'made', 'given', 'taken', 'known', 'shown', 'seen', 'written', 'built', 'found', 'held',
  'kept', 'left', 'sent', 'told', 'paid', 'sold', 'led', 'driven', 'chosen', 'broken', 'spoken', 'forgotten',
  'hidden', 'eaten', 'beaten', 'thought', 'brought', 'bought', 'taught', 'put', 'set',
];

// "-ed" words that are not past-tense verbs, or adjectives that read as passive after "to be".
export const NON_VERB_ED = new Set([
  'hundred', 'kindred', 'sacred', 'naked', 'wicked', 'aged', 'speed', 'indeed', 'proceed', 'exceed',
  'succeed', 'embed', 'feed', 'need', 'seed', 'bed', 'red', 'shed', 'sled', 'weed', 'during', 'used',
  'based', 'required', 'related', 'advanced', 'limited', 'embedded', 'united', 'newfound',
]);
export const ADJECTIVE_ED = new Set([
  'interested', 'excited', 'tired', 'concerned', 'worried', 'motivated', 'surprised', 'amazed',
  'pleased', 'bored', 'confused', 'involved', 'located', 'supposed', 'prepared', 'qualified', 'dedicated',
]);

// Words after sentence-initial "This/It/..." that signal a vague pronoun (book: repeat the noun).
export const VAGUE_NEXT = new Set([
  'is', 'are', 'was', 'were', 'will', 'can', 'could', 'would', 'should', 'may', 'might', 'must', 'has',
  'have', 'had', 'does', 'did', 'makes', 'made', 'means', 'allows', 'shows', 'lets', 'gives', 'helps',
  'force', 'forces', 'also', 'only', 'just', 'really', 'seems', 'became', 'becomes', 'works', 'creates',
]);

export const ABBREVIATIONS = new Set(['e.g', 'i.e', 'vs', 'etc', 'mr', 'mrs', 'ms', 'dr', 'fig', 'no', 'inc', 'u.s', 'st', 'approx']);

export const LIMITS = {
  sentenceMax: 25,       // book: keep sentences to 25 words or fewer
  sentenceWarn: 21,      // research: ~20 is a good upper limit
  paragraphSentences: 5, // book: 3-5 sentences, about 125 words
  paragraphWords: 125,
  headingMaxWords: 8,
  gradeTarget: 7,        // book: average US reading level is 5th-7th grade
};

// Rubric predictor (an ESTIMATE; the grader's cutoffs are unknown).
// Counts problem sentences (past/future/long) plus long paragraphs.
export const BANDS = { full: 2, partial: 8 }; // <=full -> 100, <=partial -> 80, else 0
