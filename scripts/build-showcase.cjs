const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'showcase');
const data = (file, type) => `data:${type};base64,${fs.readFileSync(file).toString('base64')}`;

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    const capture = async (project, selector, prepare) => {
      await page.goto(pathToFileURL(path.join(root, `projects/${project}/index.html`)).href);
      await page.evaluate(() => document.fonts.ready);
      if (prepare) await prepare();
      const target = page.locator(selector).first();
      await target.scrollIntoViewIfNeeded();
      await page.waitForTimeout(900);
      return `data:image/png;base64,${(await target.screenshot()).toString('base64')}`;
    };
    const cohort = await capture('thelook', '#cohort-grid', async () => {
      await page.locator('#cohort-grid').evaluate(el => {
        el.style.zoom = Math.min(1, el.parentElement.clientWidth / el.scrollWidth);
      });
    });
    const campaign = await capture('campaign', '#sales-chart');
    const segments = await capture('segmentation', '#kmeans-chart', async () => {
      for (let step = 0; step < 5; step++) {
        if (await page.locator('#kmeans-next').isEnabled()) await page.locator('#kmeans-next').click();
      }
    });
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
    const captureDemo = async (name, time) => {
      const video = page.locator(`video:has(source[src$="${name}.mp4"])`);
      await video.evaluate(async (v, seconds) => {
        v.pause();
        v.controls = false;
        await new Promise(resolve => { v.addEventListener('seeked', resolve, { once: true }); v.currentTime = seconds; });
      }, time);
      return `data:image/png;base64,${(await video.screenshot()).toString('base64')}`;
    };
    const smartlook = await captureDemo('smartlook', 56);
    const orbiview = await captureDemo('orbiview', 13.8);
    const projects = [
      ['01', 'SmartLook', 'AI-powered business intelligence', smartlook, 'AI AGENT'],
      ['02', 'Orbiview', 'Satellite imagery meets geospatial AI', orbiview, 'GEOSPATIAL AI'],
      ['03', 'Samba', 'E-commerce executive dashboard', data(path.join(root, 'assets/samba/looker-dashboard.jpg'), 'image/jpeg'), 'BUSINESS INTELLIGENCE'],
      ['04', 'Customer retention', 'Cohort analysis & product growth', cohort, 'PRODUCT ANALYTICS'],
      ['05', 'Campaign effectiveness', 'Experiments, evidence & better decisions', campaign, 'A/B TESTING'],
      ['06', 'Customer segmentation', 'Patterns in investor behavior', segments, 'MACHINE LEARNING']
    ];
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face{font-family:Pixel;src:url('${data(path.join(root, 'assets/home/VT323-Regular.ttf'), 'font/ttf')}')}
    @font-face{font-family:Mono;src:url('${data(path.join(root, 'assets/home/AnonymousPro-Regular.ttf'), 'font/ttf')}')}
    *{box-sizing:border-box}body{margin:0;width:1920px;height:1080px;background:#1014b8;color:white;font-family:Mono,monospace;padding:44px 52px 30px;letter-spacing:0}
    header{height:164px;display:flex;justify-content:space-between;align-items:flex-start}h1{font:88px/.95 Pixel;margin:0;color:#ffe34b}header p{font-size:23px;margin:14px 0 0}aside{text-align:right;padding-top:5px}.name{font:48px/1 Pixel;color:#ffe34b}.role{font:20px/1.6 Mono;margin-top:10px}
    main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px 28px}.window{height:376px;background:#c0c0c0;padding:5px;border:1px solid #111;box-shadow:inset 2px 2px white,inset -2px -2px #777,6px 6px #080c70;color:#18202b}
    .bar{height:44px;display:flex;align-items:center;padding:0 10px;background:#071b77;color:white;gap:12px;font:29px/1 Pixel}.number{color:#ffe34b;font:18px Mono}.control{margin-left:auto;color:#111;background:#c0c0c0;width:25px;height:25px;box-shadow:inset 2px 2px white,inset -2px -2px #777;text-align:center;font:24px/22px Mono}
    .visual{height:258px;background:white;display:flex;align-items:center;justify-content:center;margin-top:5px;padding:10px;overflow:hidden}.visual img{display:block;max-width:100%;max-height:100%;object-fit:contain}.caption{height:57px;background:white;padding:8px 12px;border-top:1px solid #c5c9d0}.tag{font:11px Mono;color:#1014b8}.description{font:17px Mono;margin-top:6px}
    footer{display:flex;align-items:center;justify-content:space-between;margin-top:30px;font:19px Mono}.skills{color:#ffe34b}.url{color:white}
    </style></head><body><header><div><h1>Data. Decisions. AI.</h1><p>Selected projects / From business questions to working tools.</p></div><aside><div class="name">Rafiq Naufal Kastara<span style="color:white">.</span></div><div class="role">DATA SCIENTIST · DATA ANALYST · AI BUILDER</div></aside></header><main>${projects.map(([n,title,desc,img,tag]) => `<section class="window"><div class="bar"><span class="number">${n}</span>${title}<span class="control">−</span></div><div class="visual"><img src="${img}"></div><div class="caption"><div class="tag">${tag}</div><div class="description">${desc}</div></div></section>`).join('')}</main><footer><span class="skills">SQL · Python · BI · Machine Learning · GIS · AI Agents</span><span class="url">fiqcodes.github.io/DataAnalystPortfolio</span></footer></body></html>`;
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.setContent(html);
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode())); });
    const overflow = await page.evaluate(() => document.documentElement.scrollHeight > 1080 || document.documentElement.scrollWidth > 1920);
    if (overflow) throw new Error('Showcase layout overflows');
    await page.screenshot({ path: path.join(out, 'rafiq-project-showcase-data-scientist.png'), scale: 'css' });
    console.log('Created showcase/rafiq-project-showcase-data-scientist.png (1920 x 1080)');
  } finally { await browser.close(); }
})();
