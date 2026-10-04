import { analyze } from './analyzer.js';
import { score } from './scorer.js';
import { lintGrammar } from './harper-bridge.js';

const $ = (id) => document.getElementById(id);
const essay = $('essay'), mirror = $('mirror');

const TYPES = {
  past: 'Past tense', future: 'Future tense', longSentence: 'Long sentences', longParagraph: 'Long paragraphs',
  noise: 'Noise phrases', passive: 'Passive voice', latinate: 'Fancy words', ambiguousRef: 'Vague "it/this"',
  grammar: 'Grammar & spelling', heading: 'Headings',
};
const ROWS = [
  { grp: 'Counts toward the rubric' },
  { k: 'past', t: 'Sentences in past tense' }, { k: 'future', t: 'Sentences in future tense' },
  { k: 'longSentence', t: 'Sentences over 25 words' }, { k: 'longParagraph', t: 'Paragraphs over 5 sentences' },
  { grp: 'Fix soon (no points lost yet)' },
  { k: 'noise', t: 'Table 2.1 noise phrases' }, { k: 'passive', t: 'Passive voice' },
  { k: 'latinate', t: 'Fancy words (latinates)' }, { k: 'ambiguousRef', t: 'Vague "it" / "this" openers' },
  { k: 'grammar', t: 'Grammar & spelling' }, { k: 'heading', t: 'Heading / header-block notes' },
];
const TAG = { error: 'Fix', warn: 'Check', info: 'Tip' };
const NO_HIGHLIGHT = new Set(['longParagraph', 'topicSentence', 'heading']);

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable: ignore */ } },
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let text = '', result = { issues: [], stats: {} }, hidden = new Set(), baseline = null, timer = 0, gtimer = 0;
let syncIssues = [], harperIssues = [], grammarOn = store.get('engr180w.grammar') !== 'off', gstate = 'idle', ignored = new Set();
try { ignored = new Set(JSON.parse(store.get('engr180w.ignored') || '[]')); } catch { ignored = new Set(); }
try { baseline = JSON.parse(store.get('engr180w.baseline') || 'null'); } catch { baseline = null; }

const visible = (i) => !hidden.has(i.type);

function renderMirror() {
  const inline = [];
  result.issues.forEach((i, k) => { if (!NO_HIGHLIGHT.has(i.type) && visible(i) && i.end > i.start) inline.push([i, k]); });
  const pts = new Map();
  const at = (p) => { if (!pts.has(p)) pts.set(p, { open: [], close: [] }); return pts.get(p); };
  for (const [i, k] of inline) { at(i.start).open.push([i, k]); at(i.end).close.push(k); }
  const keys = [...pts.keys()].sort((a, b) => a - b);
  let html = '', pos = 0;
  const active = new Map();
  for (const p of keys) {
    if (p > pos) html += segHtml(text.slice(pos, p), active);
    const e = pts.get(p);
    e.close.forEach((k) => active.delete(k));
    e.open.forEach(([i, k]) => active.set(k, i));
    pos = Math.max(pos, p);
  }
  html += esc(text.slice(pos));
  mirror.innerHTML = html + '\n';
  mirror.scrollTop = essay.scrollTop;
}
function segHtml(s, active) {
  if (!active.size) return esc(s);
  const items = [...active.values()];
  const cls = new Set(items.map((i) => `t-${i.type}`));
  if (items.some((i) => i.type === 'longSentence' && i.severity === 'error')) cls.add('sev-error');
  return `<mark class="${[...cls].join(' ')}" data-ks="${[...active.keys()].join(' ')}">${esc(s)}</mark>`;
}

function snippet(i) {
  if (i.end === i.start) return '';
  if (['longSentence', 'longParagraph', 'topicSentence'].includes(i.type)) {
    const t = text.slice(i.start, i.end);
    return `<q>${esc(t.length > 90 ? t.slice(0, 90) + '…' : t)}</q>`;
  }
  const pre = text.slice(Math.max(0, i.start - 28), i.start).replace(/\n/g, ' ');
  const post = text.slice(i.end, i.end + 28).replace(/\n/g, ' ');
  return `<q>…${esc(pre)}<b>${esc(text.slice(i.start, i.end))}</b>${esc(post)}…</q>`;
}
const fixText = (i) => (i.replace ? `Try: ${i.fix}` : i.fix);

function renderIssues() {
  const list = $('issues');
  const shown = result.issues.map((i, k) => [i, k]).filter(([i]) => visible(i));
  if (!text.trim()) { list.innerHTML = '<li class="empty">Paste an essay to see issues.</li>'; return; }
  if (!shown.length) { list.innerHTML = '<li class="empty">No issues in the selected categories. Nice work.</li>'; return; }
  const CAP = 400;
  list.innerHTML = shown.slice(0, CAP).map(([i, k]) =>
    `<li class="issue" tabindex="0" role="button" data-k="${k}"><span class="tag ${i.severity}">${TAG[i.severity]}</span>${esc(i.message)}${snippet(i)}<div class="fix">${esc(fixText(i))}${i.ignoreKey ? ` <button type="button" class="ignore" data-key="${esc(i.ignoreKey)}">Ignore</button>` : ''}</div></li>`).join('')
    + (shown.length > CAP ? `<li class="empty">Showing the first ${CAP} of ${shown.length}.</li>` : '');
}

function renderScore() {
  const s = score(result);
  $('band').dataset.band = s.band;
  $('band').innerHTML = `<span class="num">${s.band}</span>`;
  $('bandLabel').textContent = `${s.label} · ${s.rubricIssues} problem spot${s.rubricIssues === 1 ? '' : 's'}`;
  $('counts').innerHTML = ROWS.map((r) => {
    if (r.grp) return `<li class="grp">${r.grp}</li>`;
    const n = s.counts[r.k];
    let d = '';
    if (baseline && baseline.counts) {
      const diff = n - (baseline.counts[r.k] || 0);
      if (diff) d = `<span class="delta ${diff < 0 ? 'better' : 'worse'}">${diff < 0 ? '▼' : '▲'} ${Math.abs(diff)} vs baseline</span>`;
    }
    return `<li><span>${r.t}</span><span><span class="n">${n}</span>${d}</span></li>`;
  }).join('');
  const st = result.stats;
  $('stats').textContent = text.trim()
    ? `${st.words} words · ${st.sentences} sentences · reading grade ${st.grade} (book target: 5th–7th)` : '';
  return s;
}

function renderFilters() {
  $('filters').innerHTML = Object.entries(TYPES).map(([k, v]) =>
    `<button type="button" data-type="${k}" aria-pressed="${!hidden.has(k)}">${v}</button>`).join('');
}

function merge() {
  const custom = syncIssues.filter((i) => i.type === 'grammar');
  const heads = (result.paragraphs || []).filter((p) => p.isHeading);
  const inHeading = (h) => h.kind === 'Spelling' && heads.some((p) => h.start >= p.start && h.end <= p.end); // names, course codes
  const extra = harperIssues.filter((h) => !ignored.has(h.ignoreKey) && !inHeading(h)
    && !custom.some((c) => h.start < c.end && c.start < h.end));
  result = { ...result, issues: [...syncIssues, ...extra].sort((a, b) => a.start - b.start || a.end - b.end) };
}

function renderStatus() {
  const el = $('gstatus');
  const msg = { off: 'Grammar & spelling check is off.', loading: 'Loading the grammar engine (about 16 MB, one time)…',
    checking: 'Checking grammar…', idle: 'The grammar engine loads when you add text.', ready: 'Grammar & spelling engine ready (runs locally).',
    error: 'The grammar engine could not load, so only the built-in grammar rules and your browser spell check are active.',}[gstate];
  el.textContent = msg + (ignored.size ? ` ${ignored.size} ignored.` : '');
  if (ignored.size) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Reset ignored'; b.className = 'ignore'; b.id = 'resetIgnored';
    el.append(' ', b);
  }
  essay.spellcheck = gstate === 'error' || gstate === 'off';
}

function refresh() {
  result = analyze(text);
  syncIssues = result.issues;
  harperIssues = [];
  merge();
  renderAll();
  runHarper();
}
function renderAll() { renderScore(); renderIssues(); renderMirror(); renderCaret(); renderStatus(); }

function runHarper() {
  clearTimeout(gtimer);
  if (!grammarOn) { gstate = 'off'; renderStatus(); return; }
  if (!text.trim()) { if (gstate !== 'ready') gstate = 'idle'; renderStatus(); return; }
  gtimer = setTimeout(async () => {
    const snapshot = text;
    gstate = gstate === 'ready' ? 'checking' : 'loading';
    renderStatus();
    const { issues, error } = await lintGrammar(snapshot);
    if (snapshot !== text) return; // text changed while linting; a newer run is queued
    gstate = error ? 'error' : 'ready';
    harperIssues = issues;
    merge();
    renderAll();
  }, 600);
}

function renderCaret() {
  const box = $('caret');
  if (!text.trim()) { box.textContent = 'Click inside your text to see what is flagged at the cursor.'; return; }
  const p = essay.selectionStart;
  const hits = result.issues.filter((i) => i.end > i.start && visible(i) && p >= i.start && p <= i.end && i.type !== 'longParagraph').slice(0, 4);
  box.innerHTML = hits.length
    ? 'At cursor: ' + hits.map((i) => `<div class="hit"><span class="tag ${i.severity}">${TAG[i.severity]}</span>${esc(i.message)} <span class="muted">${esc(fixText(i))}</span></div>`).join('')
    : 'Nothing flagged at the cursor.';
}

function jumpTo(k) {
  const i = result.issues[k];
  if (!i || i.end === i.start) return;
  const m = mirror.querySelector(`[data-ks~="${k}"]`);
  essay.focus({ preventScroll: true });
  essay.setSelectionRange(i.start, i.end);
  if (m) essay.scrollTop = Math.max(0, m.offsetTop - 80);
  mirror.scrollTop = essay.scrollTop;
  renderCaret();
}

function report() {
  const s = score(result);
  const lines = [`ENGR180W Writing Check: predicted band ${s.band} (${s.label}); ${s.rubricIssues} problem spots`,
    `${result.stats.words || 0} words, reading grade ${result.stats.grade || 0}`, ''];
  for (const r of ROWS) if (r.k) lines.push(`${r.t}: ${s.counts[r.k]}`);
  lines.push('');
  for (const i of result.issues) {
    if (i.end === i.start) { lines.push(`- ${i.message}`); continue; }
    const q = text.slice(i.start, i.end).replace(/\s+/g, ' ');
    lines.push(`- [${TAG[i.severity]}] "${q.length > 80 ? q.slice(0, 80) + '…' : q}": ${i.message} ${fixText(i)}`);
  }
  return lines.join('\n');
}

essay.addEventListener('input', () => {
  text = essay.value;
  store.set('engr180w.text', text);
  mirror.innerHTML = esc(text) + '\n';
  harperIssues = [];
  clearTimeout(timer);
  timer = setTimeout(refresh, 200);
});
essay.addEventListener('scroll', () => { mirror.scrollTop = essay.scrollTop; });
['click', 'keyup', 'select'].forEach((ev) => essay.addEventListener(ev, renderCaret));

$('issues').addEventListener('click', (e) => {
  const ig = e.target.closest('.ignore');
  if (ig) { ignored.add(ig.dataset.key); store.set('engr180w.ignored', JSON.stringify([...ignored])); merge(); renderAll(); return; }
  const li = e.target.closest('.issue'); if (li) jumpTo(+li.dataset.k);
});
$('gstatus').addEventListener('click', (e) => {
  if (e.target.id !== 'resetIgnored') return;
  ignored.clear(); store.set('engr180w.ignored', '[]'); merge(); renderAll();
});
$('grammarToggle').checked = grammarOn;
$('grammarToggle').addEventListener('change', (e) => {
  grammarOn = e.target.checked; store.set('engr180w.grammar', grammarOn ? 'on' : 'off');
  if (!grammarOn) { harperIssues = []; merge(); renderAll(); } else runHarper();
  renderStatus();
});
$('issues').addEventListener('keydown', (e) => {
  const li = e.target.closest('.issue');
  if (li && e.target === li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); jumpTo(+li.dataset.k); }
});
$('filters').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const t = b.dataset.type;
  hidden.has(t) ? hidden.delete(t) : hidden.add(t);
  renderFilters(); renderIssues(); renderMirror(); renderCaret();
});
$('clear').addEventListener('click', () => {
  if (text.trim() && !confirm('Clear the editor? Your text is only saved in this browser.')) return;
  essay.value = ''; text = ''; store.set('engr180w.text', ''); refresh();
});
$('baseline').addEventListener('click', () => {
  const s = score(result);
  baseline = { counts: s.counts, rubricIssues: s.rubricIssues };
  store.set('engr180w.baseline', JSON.stringify(baseline));
  renderScore();
  $('baseline').textContent = 'Baseline saved';
  setTimeout(() => { $('baseline').textContent = 'Save baseline'; }, 1500);
});
$('copy').addEventListener('click', async () => {
  const r = report();
  try { await navigator.clipboard.writeText(r); }
  catch { const t = document.createElement('textarea'); t.value = r; document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); }
  $('copy').textContent = 'Copied';
  setTimeout(() => { $('copy').textContent = 'Copy report'; }, 1500);
});

renderFilters();
essay.value = store.get('engr180w.text') || '';
text = essay.value;
refresh();
