import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../src/analyzer.js';
import { score } from '../src/scorer.js';

const run = (t) => score(analyze(t));
const sent = (n) => Array.from({ length: n }, () => 'Bob ran to the car.').join(' ');

test('empty -> 100 and zero counts', () => {
  const s = run('');
  assert.equal(s.band, 100);
  assert.equal(s.rubricIssues, 0);
});

test('bands: <=2 -> 100, 3..8 -> 80, >=9 -> 0', () => {
  const lines = (n) => Array.from({ length: n }, () => 'Bob ran to the car.').join('\n');
  assert.equal(run(lines(2)).band, 100);
  assert.equal(run(lines(3)).band, 80);
  assert.equal(run(lines(8)).band, 80);
  assert.equal(run(lines(9)).band, 0);
});

test('a sentence both past and long counts once', () => {
  const longPast = 'Bob ran to the car and ' + Array.from({ length: 30 }, () => 'word').join(' ') + '.';
  assert.equal(run(longPast).rubricIssues, 1);
});

test('noise and passive alone do not lower the band', () => {
  assert.equal(run('You can utilize this tool in order to win.').band, 100);
});

test('sentence-per-paragraph helper sanity', () => {
  assert.ok(run(sent(6)).counts.longParagraph === 1);
});
