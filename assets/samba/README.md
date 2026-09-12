# Samba article assets

This is a local-first static article. The portfolio homepage is not part of this change.

## Data

`data.js` contains aggregate statistics only. `scripts/samba-source.json` freezes the same aggregates with the source workbook hash and saved-export date. No order, customer or seller identifiers or geolocation coordinates are published in the interactive data.

Import a fresh authorized source export with `python scripts/build-samba.py --workbook PATH --dashboards`. This requires openpyxl and pypdf. `python scripts/build-samba.py` rebuilds from the frozen aggregates using only the standard library. `python scripts/verify-samba.py` checks totals, reported findings and article references.

City aggregation uses city and state together. Item quantity is the mean of `qty_item`, not a distinct-product count. AOV is total payment divided by order count. The source does not identify an ISO currency code, so values retain its dollar notation without conversion. The workbook, rather than screenshot bar lengths, supplies the interactive values. Snapshot differences are disclosed in the article.

## Images

`looker-dashboard.jpg` and `tableau-dashboard.jpg` are the original embedded JPEG bytes from the supplied project document (pages 6 and 12). They are not redrawn, AI-generated or live embeds. The project dashboards remain linked to their external tools.

`brazil-commerce.png` was generated with the built-in image-generation tool on 2026-09-12. It is a conceptual illustration, not a photograph of Samba or an observed delivery route.

Prompt: Create a wide landscape editorial illustration asset for a Brazilian e-commerce data-story called Samba. NO text, NO lettering, NO charts, NO UI. Brazilian modernist screenprint / sophisticated cut-paper poster style, visible subtle paper and ink textures, crisp geometric forms. Strong vivid emerald green, sunshine yellow, white, cobalt blue accents and tiny tomato-red detail. Depict the actual subject e-commerce: a lively stylized Sao Paulo neighborhood of modernist apartment blocks and small shopfronts, a delivery bicycle with packages, hands passing a parcel, shopping parcels, a small delivery van. A coherent continuous city scene, not floating clipart. Artistic and grown-up, not childish or carnival or football. Panoramic composition roughly 2:1. LEFT 42 percent is a mostly uninterrupted rich emerald green wall/sky with very subtle screenprint texture, deliberately calm enough for large white/yellow webpage typography overlay. RIGHT side densely composed city and commerce illustration with architecture extending across the bottom, all core delivery subjects visible. Bright high contrast, flat colors, no gradients, no 3D, no rounded card, no borders.

The local D3 v7 runtime and Font Awesome assets are reused without modification.
