import test from 'node:test';
import assert from 'node:assert/strict';
import { NOISE, LIMITS, BANDS } from '../src/rules.js';

const find = (p) => NOISE.find((n) => n.phrase === p);

test('Table 2.1: all 37 phrases present with fixes', () => {
  assert.equal(NOISE.length, 37);
  assert.equal(find('in order to').fix, 'to');
  assert.equal(find('utilize').fix, 'use');
  assert.equal(find('will have to').fix, 'must');
  assert.equal(find('would like').fix, 'want');
});

test('every noise entry compiles to a valid regex', () => {
  for (const n of NOISE) assert.doesNotThrow(() => new RegExp(n.re, 'gi'), n.phrase);
});

test('limits and bands', () => {
  assert.equal(LIMITS.sentenceMax, 25);
  assert.equal(LIMITS.paragraphSentences, 5);
  assert.ok(BANDS.full >= 0 && BANDS.partial > BANDS.full);
});
