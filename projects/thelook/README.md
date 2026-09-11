# TheLook: User Retention & Product Growth

Open `index.html` directly. This is an offline-capable article in the existing static portfolio, with no build server or new frontend framework. The homepage is unchanged pending approval.

## Source and Reproduction

The original presentation's linked charts identified three source workbooks. Their saved result values were read through Google Sheets on September 10, 2026 and frozen in `scripts/thelook-source.json`:

- Revenue: `1KsUErJfRoHT4jSt8H307V5H-Nl9IhFKxIKRpEs85_d8`, `Sheet1!A1:F28` (26 category rates).
- Profit: `1wycikC7H0uGMFcDpNkH9l6OxkS1HCO-DI3t8_iMEoR0`, `Sheet1!A1:G28` (26 category totals/rates/contributions), with formula checks in `A1:G4`.
- Cohorts: `1R271phMAOKHoY9bLoxJ5HnPAk1oP3FKDFzTWFdxBzXQ`, `'Raw Data'!A1:F85` (78 populated cohort/month records).

The source PDF was inspected in full for text, SQL and recommendations, with rendered chart/table pages checked against the sheets. Underlying historical BigQuery tables were not rerun. Do not claim raw-order validation, regenerated completed-only retention, or fresh live retailer metrics.

```sh
python scripts/build-thelook.py
python scripts/verify-thelook.py
node --check assets/thelook/article.js
```

Both Python scripts use the standard library. The builder recalculates derived totals, all cohort percentages and the internal contribution shares, then exports `assets/thelook/data.js`. An input SHA-256 ties the public data bundle to the frozen source.

## Important Definitions

- TheLook is a fictional/synthetic e-commerce dataset. The scenario is 2023 resource optimization using 2021/2022 results.
- Gross profit means sale price less product cost, not net profit. Currency units are not relabeled as dollars or rupiah.
- All 26 categories grew. The weakest growth is relative underperformance, not falling sales.
- The source's `Market Share` column is `=(profit_2022-profit_2021)/SUM(all_profit_increases)*100`, not external market share or the share of 2022 profit. The article labels it accurately and preserves the original values.
- 7.5% contribution and 100% growth are descriptive reference lines from the chart, not validated investment thresholds. The shortlisted investment categories are not claimed to be low-growth cash generators.
- Cohorts begin with the first completed order across all available history. Later user-month activity includes any status; a completion filter is absent in that step of the documented SQL. Existing numbers are preserved as recorded order activity.
- Month zero is 100% by construction. Only observed cells are stored. Months after December 2022 are unobserved, never imputed as zero.
- Next-month pooled activity is 892/11,927 = 7.4788295464%, excluding December. Cohort sizes total 13,822. Monthly repeat counts cannot be summed to obtain unique returning customers.
- Growing cohorts do not prove successful acquisition tactics. Later cohorts have less observation time; compare at the same cohort age. Coupons and resource changes are proposed experiments, not measured outcomes.

## SQL

`growth.sql` consolidates the two original annual growth queries while keeping their completed-item filter, join and two-year category comparison. `retention.sql` preserves the original cohort and activity definition in a readable form. `retention-completed.sql` is clearly marked as a proposed follow-up and is not used to manufacture new result values. These files were inspected and statically checked, not executed against BigQuery.

## Presentation

Independent fashion-editorial design: generated garment cover, serif typography, a quiet reading rail, blue/red chart emphasis, selectable category comparisons, and interactive cohort views. D3 is reused from `assets/lalafood/d3.min.js`; Font Awesome is reused from the portfolio. Existing assets are not modified. The generated cover is illustrative and not a representation of actual TheLook merchandise.

Reference architecture: [Raihan Kalla's scrolly system](https://github.com/alharkan7/alharkan7.github.io/tree/main/src/scrolly) and [documentation](https://www.raihankalla.id/create-scrollytelling), adapted to the existing static site. Narrative, source data and runtime remain separate. No Astro migration or hosting change is made.
