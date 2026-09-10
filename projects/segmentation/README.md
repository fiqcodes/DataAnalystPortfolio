# User Segmentation and Churn Prediction

A self-contained static article with a distinct editorial design. Open `index.html` directly; the site needs no build server or network connection. The portfolio homepage changes only the segmentation project's View Project link to this article. The LalaFood article is unchanged.

## Implementation

- `projects/segmentation/index.html`: narrative, layout, accessible native controls, methodology.
- `assets/segmentation/article.css`: graphite/white editorial design with red, blue, yellow and teal segment colors, full-width chapters and inline explorations.
- `assets/segmentation/article.js`: D3 charts, interactions, lazy chart mounting, responsive redraws, keyboard tooltips, reduced-motion support.
- `assets/segmentation/data.js`: anonymous aggregates, holdout confusion matrices, numeric/category coefficient summaries and explicitly synthetic K-means frames. No user identifiers, record-level predictions, or private source files are shipped.
- `scripts/build-segmentation.py`: reproducible data reconstruction and supplementary evaluation.
- `scripts/verify-segmentation.py`: standard-library HTML/link/data checks.

Uses the existing locally bundled D3 7.9.0 (`assets/lalafood/d3.min.js`, its license in `assets/lalafood/D3-LICENSE.txt`) and the portfolio's existing Font Awesome icons. No new runtime dependencies. K-means demonstrations are precomputed using scikit-learn rather than a hand-written clustering engine.

The reference [scrollytelling documentation](https://www.raihankalla.id/create-scrollytelling), repository `docs/scrollytelling.md`, `src/scrolly/README.md`, and `src/scrolly/viz/scatter.ts` informed the separation of narrative, data, rendering and scroll behavior. The article deliberately uses a different layout from the reference sidecar. No reference code is copied.

## Sources and Reconciliation

Original case-study findings come from `deck/Python_User Segmentation.pdf`, the linked [notebook](https://colab.research.google.com/drive/18YIeKDHR-7Ne8duCf9cnPQc1244yb13i), its [source datasets](https://drive.google.com/drive/folders/1DAW2Ai1R3pvyhUED1lJhHGcSChG8Pzro), and the [campaign workbook](https://docs.google.com/spreadsheets/d/1oxb1_wwiNOsM6Bvf6i5lG9pOl3LYB3xI1CGLiEawjEU/edit). The reader-facing article contains no PDF references.

The 2025 notebook has different cluster outputs and aborted regression cells. The original counts can be reconstructed exactly using squared Mahalanobis distance with the 90th-percentile chi-square cutoff (3 degrees of freedom), MinMax scaling, an ordinal income feature weighted by 1.75, and KMeans(k=4, random_state=10, n_init=10). This retains 7,667 of 8,277 matched users. The later notebook uses an unsquared distance and a changed default number of initializations, giving a different cohort.

Recovered segments: Newcomers 2,798; Beginners 2,347; Frequent users 812; High-value users 1,710. All four invested-balance means match the original displayed values when truncated to whole rupiah. The article uses consistent rounding. High-value users is a human-readable renaming of Rich User. The source's claim that these are transaction-size averages is corrected: they are last recorded invested balances.

The data reconstruction also yields 3,091 churn labels, matching the original 40.32% churn insight. Observed segment and behavioral churn rates are reconstructed descriptive aggregates, not historical predicted probabilities. Audience percentages use distinct users rather than user-day weighting. Historical EDA percentages that used user-day weighting are therefore not mislabeled as shares of users.

Campaign rates remain 58.88%, 65.21%, 61.54%, 67.35%. The workbook's exact fractional planning contacts (839.4, 704.1, 243.6, 513), rounded churn counts (494, 459, 150, 346), cost Rp1,000, fee 0.15%, and 1.5 fee multiplier reproduce all saved net returns within Rp0.01. The conflicting prose target counts are omitted. The calculator changes assumptions, not historical outcomes, and is not presented as incremental campaign ROI.

## Supplementary Revalidation

Historical model performance and coefficients are absent from the available completed outputs. A separately labeled fresh revalidation supplies the threshold explorer, holdout metrics and coefficient view. It does not replace the historical target lists or campaign estimates.

Balanced logistic regression (L2, lbfgs, max_iter=2000), training-only StandardScaler and OneHotEncoder(drop=first), stratified 80/20 split with random_state=42. Numeric inputs: age, last invested balance, total buy, signed total sell, registration age. Categorical controls: gender, referral, occupation, income, income source, original reconstructed segment. The notebook's registration-derived variable is correctly named registration age, not inactivity. No synthetic investor risk estimates are exposed.

Revalidation under scikit-learn 1.9.0: 6,133 train / 1,534 test users, 0.5-threshold confusion matrix [[632,284],[247,371]], accuracy 65.3846%, precision 56.6412%, recall 60.0324%, ROC AUC 0.689794. All threshold matrices are exported, not recomputed from invented score distributions. Numeric coefficients are per standard deviation and conditional on all controls, not a complete feature-importance ranking.

Important limitations: clusters were defined retrospectively using the full cohort; a random split does not establish future performance; source labels lack a documented inactivity window; the zero-balance/churn relationship warrants a label-timing audit. The article explicitly calls for temporal validation, calibration, feature-timing checks and controlled campaign tests before operational use.

## Rebuild

Python dependencies: pandas, numpy, scipy, scikit-learn==1.9.0, openpyxl. Put the four read-only source exports in one directory:

`python_users.xlsx`, `python_daily_user_transaction.xlsx`, `python_churn_users.xlsx`, `benefit_cost.xlsx`.

Run `python scripts/build-segmentation.py /path/to/source-directory`, then `python scripts/verify-segmentation.py`. Source SHA-256 fingerprints are retained in `data.js`. Do not commit raw user data or the downloaded notebook.
