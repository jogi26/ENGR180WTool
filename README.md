# ENGR180W Writing Checker

A browser tool that checks an essay against the **Clear Writing Guidelines** in *Engineering Words* (2nd ed., Burton & Graham Gonzalez), chapter 2, and predicts the "Writing guidelines" rubric band (100 / 80 / 0).

It flags problems and cites the book's fix. It does **not** write or rewrite your essay, so it stays on the right side of ENGR180W's AI rules.

**Privacy:** static HTML/JS only. No server, no analytics, no network calls. Your text stays in your browser (autosaved to `localStorage` on your device only).

## What it checks
| Check | Rule from the book | Counts toward rubric |
|---|---|---|
| Future tense | Present tense; delete "will" and fix the verb | Yes |
| Past tense (heuristic) | Present tense puts the action in the now | Yes |
| Long sentences | 25 words or fewer (about 20 is best) | Yes |
| Long paragraphs | 3-5 sentences, about 125 words | Yes |
| Noise phrases | All 37 entries of Table 2.1 ("in order to" -> "to", "may" -> "can", ...) | No (yet) |
| Passive voice (heuristic) | Actor first | No (yet) |
| Latinates | Plain words ("commence" -> "start") | No |
| Vague "It"/"This" openers | Repeat the noun | No |
| Reading grade | Target 5th-7th grade | No |

Rubric prediction counts problem sentences (past, future, over 25 words) plus long paragraphs: up to 2 -> 100, 3-8 -> 80, 9 or more -> 0. These cutoffs are an **estimate** (tune them in `src/rules.js`, `BANDS`).

Headings (short lines with no end punctuation) are skipped. Tense and passive checks are heuristics, so ignore a flag that is not really a verb.

## Use
Open the site, paste your essay, and click any issue to jump to it. "Save baseline" lets you compare counts after a revision (handy for do-overs). "Copy report" exports the issue list.

## Develop
```
npm test        # node --test tests/ (no dependencies)
npm run serve   # http://localhost:8080
```
`src/rules.js` (data) -> `src/segment.js` -> `src/analyzer.js` -> `src/scorer.js` are pure and tested; `src/app.js` is the DOM layer. Design: `docs/superpowers/specs/`.
