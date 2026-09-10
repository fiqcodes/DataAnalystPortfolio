# Campaigns & Sales

An offline-capable interactive article at `projects/campaign/index.html`. No build or dev server is required to read it. The homepage is intentionally unchanged pending approval.

## Files

- `index.html`: narrative, semantic controls, methodology and fallback findings.
- `../../assets/campaign/article.css`: project-specific diner/editorial design.
- `../../assets/campaign/article.js`: D3 charts, controls, tooltips and reading progress.
- `../../assets/campaign/data.js`: reproducible statistics and anonymous store averages.
- Existing local D3 7.9.0, Font Awesome and `images/FastFood.jpg` are reused without modification. The photograph is illustrative, not the case-study chain.

## Reproduce

Use Python with pandas, numpy, openpyxl and scipy (a SciPy version supporting `TtestResult.confidence_interval`). The source export is not committed.

```sh
python scripts/build-campaign.py /path/to/campaign_sales.xlsx
python scripts/verify-campaign.py
node --check assets/campaign/article.js
```

The workbook is linked in the article's analysis notes. The builder reads only the `Advanced Dataset` tab, validates unique store-week records and stable store assignments, and stores an input SHA-256 in `data.js`. The browser needs neither Python nor network access.

## Numerical and Editorial Decisions

- Retain the three documented, two-sided pooled weekly promotion tests (alpha 0.05). Promotion 1 versus 3 has p = 0.1207966705; it is not a confirmed win or an equivalence result.
- Explicitly label the additional Welch sensitivity tests using each store's four-week mean. These avoid treating four repeated measurements as four stores but do not correct market-level clustering.
- Optional Holm adjustment covers only the three promotion comparisons, separately within each analysis unit. Confidence intervals remain individual unadjusted 95% intervals.
- Average weekly sales are 58.0990, 47.3294 and 55.3645 thousand for Promotions 1, 2 and 3. Totals are 9,993.03, 8,897.93 and 10,408.52 thousand. The currency is unspecified.
- Recompute all nine market/promotion means directly. Use 75.2359 for Large/1 and 45.4689 for Medium/3, correcting inconsistent rounded narrative figures in the source material.
- The raw dataset gives mean ages of 10.8, 8.7875 and 7.142857 for Small, Medium and Large markets respectively. Some source narrative labels transpose the medium/large ages; the article follows the raw rows.
- Preserve the documented ordinal-coded regression as descriptive only. Its R-squared is 0.208746, not evidence of strong forecasting performance. Age coefficient p = 0.2208672; the 95% interval crosses zero.
- Document random market selection without inventing random promotion assignment. Avoid causal lift, ROI or profitability claims: no untreated control or cost/margin records are supplied.
- Only anonymous store indices, market sizes, promotion numbers, ages and four-week averages enter the public data bundle. No original location or market IDs are exported.

## Reference Approach

The design draws on the narrative/data/runtime separation and D3 chart modules documented in [Raihan Kalla's scrolly system](https://github.com/alharkan7/alharkan7.github.io/tree/main/src/scrolly), and the pacing described in [Create Scrollytelling](https://www.raihankalla.id/create-scrollytelling). It is an independent static implementation, not a port of the Astro/MDX site. No new framework or build dependency is imposed on this portfolio.

Chart data is real. The null t-density is generated with SciPy, not simulated sales data. The hero photograph and site fonts are presentation assets only.
