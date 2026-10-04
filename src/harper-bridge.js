// Loads the vendored Harper grammar engine (WebAssembly, runs locally) on first use.
// lintGrammar(text) -> issues[] of type "grammar". Never throws; returns { issues, error }.

let linterPromise;
function getLinter() {
  if (!linterPromise) {
    linterPromise = (async () => {
      const [{ LocalLinter }, { binary }] = await Promise.all([
        import('../vendor/harper/index.js'), import('../vendor/harper/binary.js'),
      ]);
      const linter = new LocalLinter({ binary });
      await linter.setup();
      return linter;
    })();
    linterPromise.catch(() => { linterPromise = undefined; });
  }
  return linterPromise;
}

const SKIP_KINDS = new Set(['Readability', 'Style', 'Enhancement', 'Regionalism', 'Formatting']);

// Harper offsets count Unicode characters; convert to UTF-16 indexes when the text has astral characters.
function indexMap(text) {
  if (!/[\uD800-\uDFFF]/.test(text)) return null;
  const map = [];
  let u = 0;
  for (const ch of text) { map.push(u); u += ch.length; }
  map.push(u);
  return map;
}

function skipSpelling(text, start, end) {
  const w = text.slice(start, end);
  if (/^[A-Z0-9]{2,}$/.test(w) || /\d/.test(w)) return true; // acronyms, model numbers
  if (/^[A-Z]/.test(w)) { // proper noun unless it starts a sentence
    const before = text.slice(0, start).trimEnd();
    return !(before === '' || /[.!?]["')”’]*$/.test(before));
  }
  return false;
}

export async function lintGrammar(text) {
  if (!text.trim()) return { issues: [] };
  try {
    const linter = await getLinter();
    const lints = await linter.lint(text, { language: 'plaintext' });
    const map = indexMap(text);
    const issues = [];
    for (const l of lints) {
      const kind = l.lint_kind();
      if (SKIP_KINDS.has(kind)) continue;
      const sp = l.span();
      const start = map ? map[sp.start] : sp.start;
      const end = map ? map[sp.end] : sp.end;
      if (!(end > start) || end - start > 200) continue;
      if ((kind === 'Spelling' || kind === 'Typo') && skipSpelling(text, start, end)) continue;
      const sugg = l.suggestions().map((s) => s.get_replacement_text());
      const fix = sugg.length ? `Try: ${[...new Set(sugg.map((s) => s || '(remove it)'))].slice(0, 3).join(' / ')}` : '';
      issues.push({
        type: 'grammar', severity: 'warn', source: 'harper', kind, start, end,
        message: `${kind === 'Spelling' || kind === 'Typo' ? 'Spelling' : 'Grammar'}: ${l.message().replace(/`/g, '"')}`,
        fix, ignoreKey: `${kind}|${text.slice(start, end).toLowerCase()}`,
      });
    }
    return { issues };
  } catch (error) {
    return { issues: [], error: String(error && error.message ? error.message : error) };
  }
}
