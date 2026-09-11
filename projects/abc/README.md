# ABC Company: The price of a place

Standalone static data story. Open `index.html` directly; all scripts, data, fonts/icons and imagery are local. No server or build step is needed to read it.

## Source and reproducibility

- Original study: `deck/Spreadsheet 1_ABC Company Analysis.pdf` (52 pages).
- Linked workbook: https://docs.google.com/spreadsheets/d/184qBPRyHoO5xHs_qMWRF5497MUslH9DmrzrsxmMPxzA/edit
- `scripts/abc-source.json`: selected columns from the September 9, 2026 workbook export, the source SHA-256, 4,801 cleaned listings, and the separate 177-row regression sample. No live feed is implied.
- `scripts/build-abc.py`: builds the browser data and independently refits full/reduced OLS with NumPy; SciPy supplies conventional coefficient confidence intervals and p-values. Run with Python, numpy and scipy. To import a different export, pass `--workbook PATH` (requires openpyxl). Source fixtures deliberately fail if headline numbers drift.
- `assets/abc/data.js`: browser-ready data, generated rather than hand-edited.
- Locally hosted D3 v7 is reused from `assets/lalafood/d3.min.js` with its existing license. Font Awesome uses the portfolio's existing local stylesheet and webfonts.

## Reconciliation decisions

1. The workbook's `EDA (Price Class)!M2` formula is `=IF(B2<=$Q$18,"Affordable","Luxury")`. Q18 is Q1 = RM715,000, NOT the RM1.3m median stated in parts of the deck. The 1,202/3,599 counts reproduce this Q1 boundary. Neutral lower/higher-price labels avoid treating these as objective affordability/luxury classes.
2. Several prices described as averages are medians: Cheras lower-tier RM450,800, Mont Kiara lower-tier RM650,000, higher-tier RM1.9m, Country Heights Damansara RM8.18m. The article calculates mean and median separately.
3. Normalized area is square feet, not the square metres stated in some narrative. Built-up versus land area is a measurement basis, not developed versus undeveloped. Mixed bases remain disclosed.
4. The full model uses the separate `(Milestone 2) DesaPark City` sheet with 177 rows. The wider cleaned table has 348 Desa ParkCity rows. No undocumented selection rule is invented.
5. Both OLS fits and sample estimates reproduce the source. Residual SE is NOT subtracted from the linear prediction. A plus/minus-one-SE range is NOT labelled a 95% prediction interval.
6. R-squared is in-sample explained variation, not prediction accuracy. Raw coefficient magnitudes have different units; size coefficients are shown per 100 sq ft for readability, not as a feature-importance ranking.
7. The source's percentile plot of prices is not a residual normality test. No claim of proven normality is carried over. Clustered discrete-feature residuals do not by themselves establish heteroscedasticity. The article retains the need for assumption review and out-of-sample validation.
8. Listing counts are supply, not completed sales, conversion or demand. The 10% revenue goal is not a measured outcome. The 20% profit-share rate is not multiplied by asking prices to fabricate revenue.
9. No source outliers are silently excluded: 370 price observations exceed Q3 + 1.5 IQR, RM5,177,500. Missing feature values are excluded only from that feature's summary.

## Design and interaction

Architectural field-guide identity: mint/white surfaces, evergreen text, vermilion findings and lime model controls, geometric system typography, numbered chapters and an illustrated scale-model cover. The cover is AI-generated illustration, not evidence about actual properties.

Price-distribution scale and ceiling controls; ranked neighborhood/property/furnishing/area-basis explorer; a 177-observation relationship/residual chart; full/reduced regression scenario controls; model coefficient intervals and a numeric table. Charts have native labels, keyboard-accessible histogram bins, ordinary labeled controls, responsive layout and reduced-motion support. Main findings remain readable without JavaScript.

Reference architecture: https://www.raihankalla.id/create-scrollytelling and https://github.com/alharkan7/alharkan7.github.io/tree/main/src/scrolly. Narrative/data/runtime separation, D3 rendering and IntersectionObserver navigation are adapted to this existing static repository, not copied into a new Astro application.

Published with the ABC project's homepage "View Project" link pointing to this article. All other homepage content and previously finished projects are unchanged.
