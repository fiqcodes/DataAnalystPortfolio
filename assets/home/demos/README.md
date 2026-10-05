# Project demos

Original videos supplied through the owner's public repository READMEs:

- SmartLook: https://github.com/fiqcodes/smartlook-ai-agent#demo
  - Attachment: https://github.com/user-attachments/assets/da746a68-1a64-404e-8b11-ed9349c14a3f
- Orbiview: https://github.com/fiqcodes/gis-ai-agent#demo
  - Attachment: https://github.com/user-attachments/assets/4f466034-3686-41f8-b3a8-3fcb601ddf15

MP4 files are original, unmodified copies. JPEG posters are frames captured from the respective demos. Local copies avoid relying on GitHub's expiring signed playback URLs. Both previews autoplay muted and loop, with native controls available. Videos retain their original aspect ratios inside a 10px light inset, avoiding cropped logos and black side letterboxing.

## Article tours

The six WebM files were recorded from this portfolio's local article pages at 1440 x 1000. The taller frame keeps complete charts visible, including the cohort heatmaps. They show actual page scrolling and working controls, with no simulated data or permanent changes to the articles. Each JPEG is a screenshot from the corresponding tour.

Each tour includes smooth camera close-ups and pull-backs around key visualizations. These capture-only transforms do not add zoom features to the live articles. Zoom strength is bounded by the entire plot's dimensions, with space for headings and axes; the recorder rejects a shot that would crop the chart. TheLook's scrollable heatmap is fitted to its recording column so all M0-M11 columns are visible. Samba opens the full dashboard at its fitted 100% view, without zooming or cropping it; only its separate trend chart receives a camera close-up. The `.tour.json` files record close-up times for frame-by-frame verification.

- `lalafood`: cuisine filters, SHAP feature filters, cohort heatmap and retention curve.
- `thelook`: profit-growth ranking, investment shortlist and cohort display modes.
- `segmentation`: K-means steps, investor segments and churn-reduction scenario.
- `campaign`: sales measures, store-level comparisons, multiple-testing adjustment and market filter.
- `abc`: budget slider, price-axis scale, property groupings and regression residuals.
- `samba`: complete inline dashboard panel, Looker Studio and Tableau each opened in the enlarged viewer at fitted 100% size (no dashboard zoom), followed by trend measures. Both viewer shots are recorded in `samba.tour.json` for encoded-frame verification.

Regenerate with Playwright and FFmpeg installed:

```sh
npx playwright install ffmpeg
node scripts/record-project-tours.cjs
# Optional: record only selected projects
node scripts/record-project-tours.cjs samba abc
```

Set `CHROME_PATH` to use an installed Chrome browser and `FFMPEG_PATH` if FFmpeg is not on PATH (Playwright's downloaded encoder also works). The script trims startup loading, adds a capture-only pointer, and leaves all article source files unchanged. Tours are silent and use the same autoplay, loop, playback controls, light inset and new-tab project links as the AI demos.
