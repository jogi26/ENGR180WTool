import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../src/analyzer.js';

const g = (t) => analyze(t).issues.filter((i) => i.type === 'grammar');
const slice = (t, i) => t.slice(i.start, i.end);

test('there is/was + plural quantity', () => {
  const t = 'There is quite a few people here.';
  const [i] = g(t);
  assert.equal(slice(t, i), 'is');
  assert.equal(i.fix, 'are');
  assert.equal(g('There was several problems.').length, 1);
  assert.equal(g('There is some water in it.').length, 0);
});

test('subject-verb agreement with base-form verb', () => {
  const t = 'This force me to find another way.';
  const [i] = g(t);
  assert.equal(slice(t, i), 'force');
  assert.equal(i.fix, 'forces');
  assert.equal(g('It help the team learn.').length, 1);
  assert.equal(g('This force is strong.').length, 0);
});

test('plural pronoun with -s verb', () => {
  const t = 'We makes tools.';
  const [i] = g(t);
  assert.equal(i.fix, 'make');
  assert.equal(g('We make tools.').length, 0);
});

test('sentence fragment starting with an -ing phrase and no verb', () => {
  const t = 'Being able to secure both hardware and software.';
  assert.equal(g(t).length, 1);
  assert.match(g(t)[0].message, /fragment/i);
  assert.equal(g('Being able to continue, I can run it.').length, 0);
  assert.equal(g('Using tools helps me learn.').length, 0);
  assert.equal(g('Using tools, I build robots.').length, 0);
});
