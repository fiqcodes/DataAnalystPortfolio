# Personal website direction

## Current direction (user feedback, 2026-09-28)
Stronger classic Windows personality: cobalt desktop canvas, silver beveled frames, deep-blue title bars, VT323 pixel-style headings, colored shortcut icons. Body text and case-study data remain easy to read. Existing articles are untouched.

## References
- https://www.thestrokes.com/ : desktop shortcuts and classic OS window chrome. Do not reproduce its artwork or build a fake operating system.
- https://vickymahfudy.github.io/ : analytical project scorecards. Use original landscape summaries based on Rafiq's preserved results, not the reference's data or prose.
- https://www.revou.co/ : moving company-logo row; only confirmed employers may replace the current labeled placeholders.

## Header and navigation
- No white toolbar above the hero. The blue hero starts at page top.
- The existing portrait uses a natural-color circular crop next to the introduction, stacking beneath it on phones. Keep the original photo file unchanged.
- Only greeting, name, photo and rotating professional title. The motion button is hidden at the user's request; operating-system reduced-motion preferences still stop animation.
- Title order: Data Analyst, Business Intelligence, Data Warehouse, AI Experimenter, Problem Solver, repeat.
- Titles delete and type one character at a time with an underscore cursor. Reduced motion shows a complete static title; assistive technology receives the full role list without character-by-character announcements.
- Six always-accessible desktop-style anchor icons below the hero; three columns on phones. No mobile menu hiding these links.
- No extra hero tagline, footer slogan, introductory labels or secondary identity line.

## Content and controls
- Remove empty current/previous role rows. Retain the labeled company-logo template until actual public history arrives.
- Remove the approach block, side taglines and decorative editorial text.
- Toolkit and project cards use beveled frames with blue title bars. The toolkit has a working minimize/restore control, not dummy window buttons.
- All skill rows start closed. Project footers contain only the project action, with no repeated metric or category count.
- Use varied previews: conversion and retention highlights, churn comparison, ranked campaign sales, price distribution, order growth with basket value, and an AI workflow. SAMBA pairs January's 28.2% order growth with nearly unchanged average order value and a monthly bar chart. Keep statistical caveats beside the chart; campaign mean sales do not establish a clear winner over Promotion 3.
- Project cards retain original destinations. Each has one descriptive title in its blue title bar, with no duplicate title in the infographic or body. Preview images are compact data-backed SVG infographics, not article cover artwork.
- Six case-study infographics use local data. SmartLook shows a clearly labeled workflow overview, not invented performance results.
- SAMBA's preview uses the same yellow (#f2cb24) for its top rule, January bar, January label, and growth figure. Bars have no outlines. The entire summary column sits on a very pale yellow (#fffdf0) panel, with no individual text highlights. Remaining chart elements stay green, distinct from the property-analysis preview.
- Keep readable body fonts, keyboard controls and reduced-motion defaults.
- Skills use explicit capability names and relevant keywords, including Data Warehousing (SQL, dbt, BigQuery, Trino), AI & Agent Development (LangGraph, RAG, LLMs), and Data Engineering (Python, SQL, Airflow). Do not add invented tenure, certifications or proficiency scores.
- Remove the pencil-icon placeholder labels and the Experience-section LinkedIn link. Placeholder company and certificate content remains a draft awaiting real details.
- Certificates & Training has seven placeholder cards in a continuously scrolling row, with hover/focus pause, manual horizontal scrolling, and a static reduced-motion fallback. Preserve the #learning anchor for existing links; the visible shortcut says Training.

## Content boundaries
Verified name, photo, original project descriptions, contact information and case-study datasets come from the existing site. Employment and certificates are explicitly approved templates, never fabricated credentials. GIS and data engineering remain interests pending actual career information. Public project anonymization remains intact.

## Implementation
Static root index.html with homepage-only assets. No server or build step for browsing. VT323 is bundled with its license; existing Font Awesome icons are reused. Infographics regenerate with scripts/build-home-previews.cjs using Node built-ins. Articles, article assets and analytical source data are untouched.
