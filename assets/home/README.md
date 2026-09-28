# Personal homepage

Open the root `index.html` directly. The page has no server or build requirement. Its six case-study links and SmartLook repository link are unchanged.

## Replace the approved placeholders

`profile.js` contains `experience` and `certificates` arrays. Empty arrays retain the generic company and certificate templates. Their pencil-icon labels are removed at the user's request. Populate the arrays with confirmed public details to replace them automatically. Asset and document paths are relative to the root homepage. Only include facts and credentials intended for public display.

Experience fields: `company`, `role`, `dates`, `description`, optional `logo` and `url`.
Certificate fields: `title`, `issuer`, `year`, `url`, and `image`.

Certificates & Training starts with seven template cards in a horizontally scrolling row. Actual certificates use the same row without a fixed seven-item limit. Hover or keyboard focus pauses automatic scrolling; touch/trackpad scrolling remains available. Reduced motion disables automatic scrolling and hides the duplicate loop items. Duplicate links are excluded from keyboard tab order and the accessibility tree.

No company logos, employers or actual certificates have been invented. Biography and toolkit copy should be reviewed alongside the eventual career details. Educational background and personal hobbies are not asserted.

## Assets and checks

- `home.css` and `home.js` are homepage-only. Project styles and data are untouched.
- Existing local Font Awesome icons supply control symbols. No external runtime requests are needed.
- `infographics/` contains seven landscape SVG summaries generated from the existing case-study data, plus a conceptual SmartLook workflow. The homepage no longer uses article cover illustrations as previews.
- Regenerate with `node scripts/build-home-previews.cjs`. No additional dependency is needed. This reads local data files; it never modifies them.
- VT323 is self-hosted for classic computer-style headings and controls. Its SIL Open Font License is included in `VT323-OFL.txt`. Source: https://github.com/google/fonts/tree/main/ofl/vt323
- Run `python3 scripts/verify-home.py` for markup, assets, destinations and preserved numeric checks.
- Run `node scripts/verify-home-browser.cjs` with `playwright` available. Set `CHROME_PATH` to use a system Chrome installation; otherwise Playwright's default Chromium is used. Screenshots are written to the system temp directory.
- Browser checks cover eight widths, all project filters, icon navigation, closed-by-default skills, keyboard toolkit minimize/restore, clipboard success/failure mocks, character-by-character typing/deletion through the full title sequence, reduced-motion pause, infographic text bounds, no-JS project access, and populated profile fixtures.
