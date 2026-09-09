# LalaFood Interactive Article

Open `index.html` directly in a browser. The story is also linked from the LalaFood project on the portfolio homepage. HTML, CSS, JavaScript, D3, and aggregate data are local; reading it needs no server, installation, or network connection.

Nine short sections follow the business question through audience, discovery, incentives, timing, modeling, SHAP, retention, and product actions. Every visualization is rendered from data. The SHAP explorer supports feature selection, category filters, sorting, and excluding the dominant co-branding feature to inspect smaller signals.

## Updating

- Edit `scripts/lalafood-story.json` for narrative and chapter structure.
- Edit `scripts/lalafood-template.html` for the page shell.
- Edit `assets/lalafood/article.css` for presentation.
- Edit `assets/lalafood/article.js` for controls and scroll orchestration.
- Edit `assets/lalafood/charts.js` for the independent D3 renderers.
- `scripts/build-lalafood.py` regenerates HTML and `data.js` from `cleaned_challenge_1.csv`, `customer_eda.ipynb`, and `statistical_modeling.ipynb`. Supply their directory as its only argument. Python dependency: pandas.
- `scripts/verify-lalafood.py` verifies key numerical fixtures, document structure, local links, anchors, and narrative length. It uses only the Python standard library.

No row-level customer data is included. Session values are aggregated using the notebook's bin definitions. Cohort observations and the ten mean absolute SHAP scores come from saved notebook outputs. SHAP scores measure magnitude in model log-odds units; qualitative direction is explained separately. No signed per-session SHAP values are fabricated.

The model comparison uses accuracy, precision, and recall, which have consistent definitions across the three models. The narrative omits incomparable F1/AUC calculations and inconsistent combined-uplift estimates. Recommendations are proposed experiments. March 2025 is identified as a partial observation month. Prose percentages are rounded consistently with the data (promotion visibility 26.92%, weekday dinner session share 23.06%).

Scrollytelling structure inspired by [al Harkan's guide](https://www.raihankalla.id/create-scrollytelling) and [reference repository](https://github.com/alharkan7/alharkan7.github.io). The article implementation is original; the reference repository's code is not copied. The locally bundled D3 library retains its license in `assets/lalafood/D3-LICENSE.txt`.
