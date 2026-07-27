# agi-progress

A tracker for the concrete, falsifiable definitions of AGI — and how much progress has actually
been made against each one.

"AGI" as a general term is close to meaningless. But a lot of specific people and organisations have
staked out checkable claims: a revenue number, a benchmark threshold, a list of five tasks, a dated
bet. This repo collects those, links each to a primary source, and scores the world against them.

## What counts for inclusion

Two rules, both narrow on purpose:

1. **The proposer has to have operationalised it** — named a threshold, task list, number or date
   concrete enough that you could argue about whether it had been crossed. A definition alone is not
   enough.
2. **It has to be one people actually cite.** This is deliberately a short list of well-known
   criteria rather than an exhaustive catalogue. Sixteen good ones beat fifty mediocre ones.

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
- Frameworks whose own authors never published a way to score them (DeepMind's Levels of AGI and its
  ten-faculty taxonomy, Legg's adversarial protocol), and criteria that specify a measure but no pass
  mark (Nilsson's employment test).

## Update cadence

**Reviewed weekly.** The criteria barely move; the numbers scored against them move constantly, so
each week the figures are re-checked against the leaderboards and the review date is bumped. A
criterion being met, a bet resolving or a deadline passing gets an update the day it happens.

Most figures can be rebuilt from machine-readable sources: `arcprize.org/media/data/leaderboard/*.json`,
`metr.org/assets/benchmark_results_1_1.yaml`, and Epoch AI's `benchmark_data.zip` (CC-BY).

### The dashboard forecast

The headline date comes from the `forecast` block on whichever criterion declares one, currently
`metaculus-weakly-general`. It moves faster than anything else on the page and needs re-reading every
week:

```json
"forecast": { "date": "2028-09-13", "forecasters": "1.8k", "as_of": "2026-07-27", "label": "..." }
```

Bump `date` and `as_of` together, so a stale figure is visible rather than silent. **This one cannot be
scripted.** Metaculus returns 403 to plain fetchers and to both API endpoints, and the community
estimate renders client-side behind the question's "Question Info" tab, so the Wayback snapshots do not
contain it either. Open the question in a browser and read the value off the page.

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
| `verification` | no | `independent` · `maintainer-checked` · `self-reported` · `unmeasured` |
| `verification_note` | no | why that tier; shown as a tooltip on the chip |
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
5. **Provenance is tagged, not assumed.** `verification` records who produced the evidence a score
   rests on. `independent` means a third party measured it; `maintainer-checked` means the
   criterion's own operator did; `self-reported` means the party being measured produced the number;
   `unmeasured` means the test has never been administered and the figure is an inference from
   proxies. Twelve of the current entries are `unmeasured` — that is a finding, not a gap.

## Contributing

Corrections, additions and disputed scores are welcome. Open a PR against
`data/definitions.json`. For a new definition, include a primary source. For a score change,
include the evidence that moves it.
