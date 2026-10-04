import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../src/analyzer.js';

const types = (t) => analyze(t).issues.map((i) => i.type);
const has = (t, type) => types(t).includes(type);

test('empty input: no crash, no issues', () => {
  assert.deepEqual(analyze('').issues, []);
  assert.deepEqual(analyze('   \n ').issues, []);
});

test('future tense (book example)', () => {
  const r = analyze('The report will print.');
  const f = r.issues.find((i) => i.type === 'future');
  assert.ok(f);
  assert.equal('The report will print.'.slice(f.start, f.end), 'will');
});

test('contraction future: I\'ll and curly apostrophe', () => {
  assert.ok(has("I'll finish it.", 'future'));
  assert.ok(has('We won’t stop.', 'future'));
});

test('passive voice (book example)', () => {
  assert.ok(has('The award was won by the writers.', 'passive'));
  assert.ok(!has('The writers won the award.', 'passive'));
  assert.ok(!has('I am interested in robots.', 'passive'));
});

test('past tense: irregular and regular, not after present aux', () => {
  assert.ok(has('Bob ran to the car.', 'past'));
  assert.ok(has('She asked a question.', 'past'));
  assert.ok(!has('Bob runs to the car.', 'past'));
  assert.ok(!has('The task is fixed by the team.', 'past'));
  assert.ok(!has('We need more speed.', 'past'));
});

test('Table 2.1 noise phrases with fixes; longest match wins', () => {
  const noise = analyze('You work in order to win.').issues.find((i) => i.type === 'noise');
  assert.equal(noise.fix, 'to');
  const w = analyze('It will be able to run.').issues;
  const fut = w.filter((i) => i.type === 'future');
  assert.equal(fut.length, 1, 'will be able to <verb> is one issue, not two');
  assert.equal(fut[0].fix, '<verb>');
  assert.ok(has('You can utilize the tool.', 'noise'));
  assert.ok(!has('The meeting is in May 2026.', 'noise'));
});

test('long sentence: >25 error, 21-25 warn', () => {
  const w = (n) => Array.from({ length: n }, () => 'word').join(' ') + '.';
  assert.equal(analyze(w(26)).issues.find((i) => i.type === 'longSentence').severity, 'error');
  assert.equal(analyze(w(22)).issues.find((i) => i.type === 'longSentence').severity, 'warn');
  assert.ok(!has(w(20), 'longSentence'));
});

test('long paragraph: more than 5 sentences', () => {
  assert.ok(has(Array.from({ length: 6 }, () => 'It is fine.').join(' '), 'longParagraph'));
  assert.ok(!has(Array.from({ length: 5 }, () => 'Tests help us.').join(' '), 'longParagraph'));
});

test('latinate and vague reference', () => {
  assert.ok(has('We commence work.', 'latinate'));
  assert.ok(has('This is hard.', 'ambiguousRef'));
  assert.ok(!has('This project is hard.', 'ambiguousRef'));
});

test('headings are not sentence-checked; HTML stays literal', () => {
  assert.equal(analyze('Why I Choose Computer Engineering').issues.length, 0);
  assert.equal(analyze('Intro\nA fine day.').issues.length, 0);
  const t = 'Use <b>bold</b> text.';
  assert.doesNotThrow(() => analyze(t));
});

test('stats: grade and counts', () => {
  const r = analyze('The cat sat. The dog ran.');
  assert.equal(r.stats.sentences, 2);
  assert.equal(r.stats.words, 6);
  assert.ok(r.stats.grade < 5);
});

test('50k words stays fast', () => {
  const big = Array.from({ length: 10000 }, () => 'The robot sorts trash well today.').join(' ');
  const t0 = Date.now();
  analyze(big);
  assert.ok(Date.now() - t0 < 4000);
});

const para = (n) => `Tests help us ship ${n}.`;
const doc = (parts) => parts.join('\n\n');

test('headings: 6 body paragraphs in a row without a heading', () => {
  const t = doc(['Title', ...[1, 2, 3, 4, 5, 6].map(para)]);
  const h = analyze(t).issues.filter((i) => i.type === 'heading');
  assert.ok(h.some((i) => i.severity === 'warn' && /heading/i.test(i.message)));
});

test('headings: a heading every 3-5 paragraphs is fine', () => {
  const t = doc(['Name Here', 'Course 101', 'Prof Smith', 'October 1, 2026', 'My Title',
    para(1), para(2), para(3), 'Part Two', para(4), para(5), para(6)]);
  assert.deepEqual(analyze(t).issues.filter((i) => i.type === 'heading'), []);
});

test('headings: heading with no text under it', () => {
  const t = doc(['Name Here', 'Course 101', 'Prof Smith', 'October 1, 2026', 'My Title', para(1), para(2), para(3), 'Empty Section', 'Next Section', para(4)]);
  assert.ok(analyze(t).issues.some((i) => i.type === 'heading' && /no text/i.test(i.message)));
});

test('headings: heading on every paragraph slows scanning', () => {
  const t = doc(['Name Here', 'Course 101', 'Prof Smith', 'October 1, 2026', 'My Title', para(1), 'B', para(2), 'C', para(3), 'D', para(4)]);
  assert.ok(analyze(t).issues.some((i) => i.type === 'heading' && /every paragraph/i.test(i.message)));
});

test('header block: missing title and missing name/course/date block', () => {
  const noTitle = analyze(doc([para(1), para(2), para(3)]));
  assert.ok(noTitle.issues.some((i) => i.type === 'heading' && /title/i.test(i.message)));
  const noBlock = analyze(doc(['My Title', para(1), para(2), para(3)]));
  assert.ok(noBlock.issues.some((i) => i.type === 'heading' && /header block/i.test(i.message)));
  const ok = analyze(doc(['Name Here', 'ENGR180W, Section 22', 'Prof Smith', 'October 1, 2026', 'My Title', para(1), para(2), para(3)]));
  assert.deepEqual(ok.issues.filter((i) => i.type === 'heading'), []);
});
