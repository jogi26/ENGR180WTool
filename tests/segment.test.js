import test from 'node:test';
import assert from 'node:assert/strict';
import { segment } from '../src/segment.js';

test('empty and whitespace input yield no paragraphs', () => {
  assert.deepEqual(segment('').paragraphs, []);
  assert.deepEqual(segment('  \n \n').paragraphs, []);
});

test('lines become paragraphs; offsets index the original text', () => {
  const text = 'First one. Second one.\n\nThird one.';
  const { paragraphs } = segment(text);
  assert.equal(paragraphs.length, 2);
  assert.equal(paragraphs[0].sentences.length, 2);
  const s = paragraphs[1].sentences[0];
  assert.equal(text.slice(s.start, s.end), 'Third one.');
});

test('abbreviations and decimals do not split sentences', () => {
  const t = 'Use tools, e.g. a GPA of 3.7 at the U.S. Air Force. Next one.';
  assert.equal(segment(t).paragraphs[0].sentences.length, 2);
});

test('short line without end punctuation is a heading', () => {
  const { paragraphs } = segment('Why I Choose Computer Engineering\nI like it. It works.');
  assert.equal(paragraphs[0].isHeading, true);
  assert.equal(paragraphs[0].sentences.length, 0);
  assert.equal(paragraphs[1].isHeading, false);
});

test('counts words with contractions and curly apostrophes', () => {
  const s = segment('I don’t know it.').paragraphs[0].sentences[0];
  assert.equal(s.words, 4);
});

test('CRLF text works', () => {
  assert.equal(segment('One. Two.\r\nThree.').paragraphs.length, 2);
});
