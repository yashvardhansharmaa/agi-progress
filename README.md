# agi-progress

A tracker for the concrete, falsifiable definitions of AGI — and how much progress has actually
been made against each one.

"AGI" as a general term is close to meaningless. But a lot of specific people and organisations have
staked out checkable claims: a revenue number, a benchmark threshold, a list of five tasks, a dated
bet. This repo collects those, links each to a primary source, and scores the world against them.

## What counts for inclusion

One rule: **the proposer has to have operationalized it** — named a criterion concrete enough to
check. A definition alone is not enough.

Deliberately excluded:

- Definitions with no threshold or measurement procedure (the OpenAI Charter's "most economically
  valuable work"; Altman's "weakly defined term"). OpenAI still appears via GDPval and the $100B
  clause, which are the forms it actually operationalized.
- Capability benchmarks whose authors never claimed they measured AGI (GPQA, SWE-bench, HLE,
  FrontierMath, OSWorld). ARC-AGI, Winograd and the Turing Test stay, because they were each
  explicitly proposed as tests of machine general intelligence.
- Predictions about consequences rather than capability (job-loss forecasts, growth-regime models).
- Regulatory compute proxies (the EU AI Act's 10^25 FLOP threshold).
- Critiques about the state of the definitions, rather than definitions.

**Live site:** https://yashvardhansharmaa.github.io/agi-progress/

## How it's built

Static HTML, CSS and vanilla JS. No build step, no dependencies, no framework.

```
index.html              the page
assets/style.css        styles (dark/light, responsive)
assets/app.js           renders the cards from the JSON
data/definitions.json   the dataset — this is the actual content
.nojekyll               tells GitHub Pages to serve files as-is
```

All content lives in `data/definitions.json`. Editing that file is the only thing you need to do to
update the site.

## Running locally

`fetch()` won't read a local file over `file://`, so serve the directory:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Data schema

Each entry in `definitions[]`:

| field | required | notes |
|---|---|---|
| `slug` | yes | kebab-case id; becomes the card's anchor for deep links |
| `name` | yes | short statement of the criterion, not the person's name |
| `proposer` | yes | who proposed it |
| `affiliation` | no | org or publication context |
| `year` | yes | when first stated |
| `category` | yes | `economic` · `benchmark` · `bet` · `lab` · `academic` · `policy` |
| `status` | yes | `passed` · `nearly` · `in-progress` · `early` · `failed` · `unfalsifiable` |
| `progress` | yes | 0–100. Ignored for `unfalsifiable` entries |
| `progress_note` | no | caption under the number, e.g. `"of the 5 tasks"` |
| `estimated` | no | `true` renders a striped bar, marking a judgement call rather than a measurement |
| `falsifiability` | no | `high` · `medium` · `low` |
| `confidence` | no | how confident the assessment is |
| `deadline` | no | resolution date, if the claim carries one |
| `stake` | no | money at risk, for bets |
| `quote` | no | the criterion verbatim |
| `quote_source` | no | attribution line under the quote |
| `status_today` | yes | the assessment. Supports `<strong>` and `<em>` only |
| `drift` | no | how the proposer's definition has changed over time |
| `source_url` | no | primary source — the original paper/post/bet, not press coverage |
| `evidence` | no | `[{label, url}]`, up to 3 shown |

## Scoring rules

1. **Numeric thresholds get arithmetic.** If a definition names a number, progress is computed
   against that number and the working is stated in `status_today`.
2. **Prose criteria get a labelled estimate.** Marked `estimated: true`, rendered with a striped
   bar so it's visually distinct from a measurement.
3. **Vague definitions are not included.** If there's no threshold and no measurement procedure,
   it isn't an operationalization and doesn't get a card. Inventing a number for these would be the
   single easiest way to make this site dishonest. (The `unfalsifiable` status remains available in
   the schema for entries that later turn out to be unscoreable.)
4. **Primary sources only.** Where popular reporting misquotes an original, the card says so.

## Contributing

Corrections, additions and disputed scores are welcome. Open a PR against
`data/definitions.json`. For a new definition, include a primary source. For a score change,
include the evidence that moves it.
