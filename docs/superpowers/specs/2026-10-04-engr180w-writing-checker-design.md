# ENGR180W Writing Checker — Design

## Purpose
A static, client-side web tool that checks an essay against the "Clear Writing Guidelines" (Chapter 2 of *Engineering Words*, 2nd ed.) and predicts the "Writing guidelines" rubric band (100 / 80 / 0). It flags problems and gives the book's fix. It does **not** write or rewrite prose (academic-integrity safe).

Triggering event: the Passion Report scored 0/100 on "Writing guidelines" (past/future tense, long sentences, long paragraphs, noise phrases from Table 2.1).

## Constraints
- Static HTML/CSS/JS, no build step, no backend, no third-party scripts, no network calls. Text never leaves the browser.
- Deployed on GitHub Pages (public repo `jogi26/ENGR180WTool`).
- Pure ES modules; `analyzer`/`scorer` have no DOM dependency so they run under Node tests.

## Units
| File | Responsibility | Depends on |
|---|---|---|
| `src/rules.js` | Data: Table 2.1 phrase table, thresholds, latinates, irregular verbs | none |
| `src/analyzer.js` | `analyze(text)` -> `{paragraphs, sentences, issues[], stats}` | rules |
| `src/scorer.js` | `score(result)` -> per-category counts + predicted band | none |
| `src/app.js` | UI: editor highlight overlay, scorecard, issue list, export, autosave | analyzer, scorer |
| `index.html`, `src/style.css` | Shell and styling | |
| `tests/*.test.js` | `node --test` suites | analyzer, scorer |

## Checks (issue `type`)
- `noise` — every Table 2.1 entry, word-boundary, case-insensitive; message includes the replacement. `<verb>` patterns handled as "phrase followed by a word".
- `future` — `will`, `won't`, `shall`; tip: delete "will", fix the verb.
- `past` — likely past-tense verbs (regular `-ed`, irregular list). Heuristic; exempt non-verb `-ed` adjectives via small stoplist.
- `passive` — form of "to be" + past participle (optionally "by"). Heuristic.
- `longSentence` — >25 words (error); 21–25 (warn).
- `longParagraph` — >5 sentences or >~125 words.
- `latinate` — utilize, facilitate, etc. (book: avoid latinates).
- `reading` — Flesch–Kincaid grade for whole text (info; target ≈5th–7th).
- `ambiguousRef` — sentence starting with "It"/"This" (book: repeat the noun).
- `topicSentence` — paragraph whose first sentence >25 words.
- `heading` — essay with >5 paragraphs and no heading-like lines (info).
- `consistency` — informational: repeated-noun synonym hints are out of scope for v1 (YAGNI); omitted.

Headings (short lines without terminal punctuation, ≤8 words) are excluded from sentence checks.

## Rubric predictor
Rubric: 100 = well done; 80 = "a few" sentences in past/future or long sentences/paragraphs; 0 = "numerous" of those.
Count `issueCount = past + future + longSentence + longParagraph` (noise/passive reported separately, "no points lost yet").
- ≤2 → 100
- 3–8 → 80
- ≥9 → 0
Thresholds live in `rules.js` (`BANDS`), labeled as an estimate; the grader's exact cutoffs are unknown.

## UI
Two panes. Left: textarea with a mirrored highlight layer (color per severity). Right: scorecard (predicted band, per-category counts), then issue list; clicking an issue scrolls/selects the span. "Compare to last check" shows count deltas (do-over view). Autosave to `localStorage` (try/catch). "Copy report" exports plain text. Light/dark via `prefers-color-scheme`. Accessible: labeled controls, severity not conveyed by color alone (icon/text tags), responsive.

## Testing
`node --test`: unit test per check using the book's own examples ("The report will print"→future, "The award was won by the writers"→passive, Table 2.1 entries, a 30-word sentence, a 7-sentence paragraph). Fixture: the Passion Report text must yield band 0 and flag known sentences; a cleaned fixture must yield 100.

## Deploy
Public repo `jogi26/ENGR180WTool`, Pages from `main` root. No Action needed (static files).
