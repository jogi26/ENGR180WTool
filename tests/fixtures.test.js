import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { analyze } from '../src/analyzer.js';
import { score } from '../src/scorer.js';

const load = (n) => fs.readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');

test('Passion Report (scored 0/100) predicts "Not at all" and flags known problems', () => {
  const text = load('passion-report.txt');
  const r = analyze(text);
  const s = score(r);
  assert.equal(s.band, 0);
  const flagged = (type) => r.issues.filter((i) => i.type === type).map((i) => text.slice(i.start, i.end));
  assert.ok(flagged('future').includes('will'));
  assert.ok(flagged('past').includes('came'));
  assert.ok(flagged('past').includes('got'));
  assert.ok(s.counts.longParagraph >= 3);
  assert.ok(flagged('longSentence').length >= 8);
  assert.ok(flagged('noise').some((t) => /utiliz/i.test(t) || /may/i.test(t)));
});

test('Passion Report: custom grammar rules catch known errors', () => {
  const text = load('passion-report.txt');
  const hit = analyze(text).issues.filter((i) => i.type === 'grammar').map((i) => text.slice(i.start, i.end));
  assert.ok(hit.includes('is'), 'There is quite a few');
  assert.ok(hit.includes('force'), 'This force me');
  assert.ok(hit.some((h) => h.startsWith('Being able to secure')), 'fragment');
});

test('Clean sample predicts 100 with no rubric issues', () => {
  const s = score(analyze(load('clean-sample.txt')));
  assert.equal(s.rubricIssues, 0);
  assert.equal(s.band, 100);
});
