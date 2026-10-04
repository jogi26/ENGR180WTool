# ENGR180W Writing Checker Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Static web tool that checks an essay against Engineering Words ch. 2 and predicts the "Writing guidelines" rubric band.

**Architecture:** Pure-function ES modules (`rules` -> `analyzer` -> `scorer`) tested with `node --test`; a thin DOM layer (`app.js`) renders highlights and a scorecard. No build, no network.

**Tech Stack:** Vanilla HTML/CSS/JS (ES modules), Node built-in test runner, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-04-engr180w-writing-checker-design.md`

## Global Constraints
- No backend, no third-party scripts, no network calls; text stays in the browser.
- Does not generate or rewrite prose; flags and cites the book's fix only.
- `analyzer`/`scorer` must have no DOM dependency.
- Rule limits: sentence >25 words error, 21–25 warn; paragraph >5 sentences or >125 words; Table 2.1 phrases copied verbatim from the book.
- Public repo `jogi26/ENGR180WTool`, Pages from `main` root.

## Review Focus
- Empty input and whitespace-only input: no crash, band 100, zero issues.
- Abbreviations/decimals ("e.g.", "3.7", "U.S.") must not split sentences.
- Heading lines (short, no end punctuation) are not counted as long/short sentences.
- Contractions ("don't", "I'm") and curly quotes/apostrophes must match rules.
- Very large paste (50k words) stays responsive (single pass, no quadratic regex).
- HTML in the essay must be escaped when highlighting (no injection).

### Task 1: Rules data
**Files:** Create `src/rules.js`; Test `tests/rules.test.js`
**Produces:** `NOISE` (array of `{pattern, replacement, example?}`), `LATINATES`, `IRREGULAR_PAST`, `NON_VERB_ED`, `LIMITS`, `BANDS`.
- [ ] Write test: every Table 2.1 entry present (e.g. `in order to`→`to`, `utilize`→`use`), `LIMITS.sentenceMax===25`.
- [ ] Run `node --test` (fails), implement `rules.js`, run (passes), commit.

### Task 2: Text segmentation
**Files:** Create `src/segment.js`; Test `tests/segment.test.js`
**Produces:** `segment(text)` -> `{paragraphs:[{start,end,isHeading,sentences:[{start,end,text,words}]}]}`; offsets index into the original text.
- [ ] Tests: two paragraphs split on blank/newline; "e.g." and "3.7" don't split; heading line flagged; empty string -> no paragraphs.
- [ ] Implement, pass, commit.

### Task 3: Analyzer
**Files:** Create `src/analyzer.js`; Test `tests/analyzer.test.js`
**Consumes:** `segment`, rules. **Produces:** `analyze(text)` -> `{issues:[{type,severity,start,end,message,fix}], stats:{words,sentences,paragraphs,grade}}`.
- [ ] Tests (book examples): "The report will print." -> `future`; "The award was won by the writers." -> `passive`; "Bob ran to the car." -> `past`; "in order to" -> `noise` fix "to"; a 30-word sentence -> `longSentence` error; 7-sentence paragraph -> `longParagraph`; "utilize" -> `latinate`; sentence starting "This is" -> `ambiguousRef`; HTML `<b>` stays literal text (escaping is app's job).
- [ ] Implement all checks, pass, commit.

### Task 4: Scorer
**Files:** Create `src/scorer.js`; Test `tests/scorer.test.js`
**Produces:** `score(result)` -> `{counts:{past,future,longSentence,longParagraph,noise,passive,latinate}, rubricIssues, band:100|80|0, label}`.
- [ ] Tests: 0–2 rubric issues ->100; 3–8 ->80; ≥9 ->0; empty ->100.
- [ ] Implement, pass, commit.

### Task 5: Passion Report fixtures
**Files:** Create `tests/fixtures/passion-report.txt`, `tests/fixtures/passion-report-clean.txt`; Test `tests/fixtures.test.js`
- [ ] Add the submitted essay text; assert band 0 and that the known noise/past/future hits are flagged. Add a hand-cleaned version; assert band 100. Commit.

### Task 6: UI
**Files:** Create `index.html`, `src/style.css`, `src/app.js`
- [ ] Editor with mirrored highlight layer (escape HTML), scorecard, issue list with click-to-jump, compare-to-last-check, localStorage autosave (try/catch), copy report, dark/light via `prefers-color-scheme`, labeled controls, severity shown by text tag plus color.
- [ ] Smoke test by loading in a headless/local server and running the analyzer on the fixture; commit.

### Task 7: README + deploy
**Files:** Create `README.md`, `.nojekyll`
- [ ] README (what it checks, how to use, privacy, limits of heuristics, rubric estimate note). Create public repo `jogi26/ENGR180WTool`, push, enable Pages on `main`, verify URL returns 200.

## Self-review
Spec coverage: all checks (Task 3), predictor (4), UI/autosave/export/compare (6), deploy (7), fixture tests (5). Consistency check/`heading` info check intentionally limited per spec ("consistency" omitted; heading lines handled in segmentation).
