const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

(async () => {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
    const root = path.resolve(__dirname, '..');
    const url = pathToFileURL(path.join(root, 'index.html')).href;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    const tours = page.locator('video:has(source[type="video/webm"])');
    assert.equal(await tours.count(), 6);
    await page.waitForFunction(() => [...document.querySelectorAll('video')].every(v => v.readyState >= 2), null, { timeout: 30000 });
    const metadata = await tours.evaluateAll(videos => videos.map(v => ({
      src: v.querySelector('source').getAttribute('src'), width: v.videoWidth, height: v.videoHeight,
      duration: v.duration, muted: v.muted, playing: !v.paused, loop: v.loop, autoplay: v.autoplay
    })));
    for (const info of metadata) {
      assert.equal(info.width, 1440);
      assert.equal(info.height, 1000);
      assert.ok(info.duration > 15 && info.duration < 65, JSON.stringify(info));
      assert.ok(info.muted && info.playing && info.loop && info.autoplay);
    }
    const before = await tours.evaluateAll(videos => videos.map(v => v.currentTime));
    await page.waitForTimeout(900);
    const after = await tours.evaluateAll(videos => videos.map(v => v.currentTime));
    assert.ok(after.every((time, index) => time > before[index]), 'All six tours advance');

    // Review the actual encoded close-ups as well as the opening and pull-back frames.
    await page.locator('video').evaluateAll(videos => videos.forEach(v => { v.pause(); v.controls = false; }));
    const frames = [];
    for (let index = 0; index < 6; index++) {
      const video = tours.nth(index);
      const shotList = JSON.parse(readFileSync(path.join(root, metadata[index].src.replace('.webm', '.tour.json')), 'utf8'));
      assert.ok(shotList.closeups.length >= 1);
      assert.ok(shotList.closeups.every(shot => shot.scale > 1.03));
      const zoomTimes = shotList.closeups.map(shot => shot.time + 0.5);
      const times = shotList.project === 'samba'
        ? [0.6, ...shotList.dashboardViews.map(shot => shot.time + 0.5), metadata[index].duration - 1]
        : [0.6, zoomTimes[0], zoomTimes[1] || metadata[index].duration * 0.45, metadata[index].duration - 1];
      if (shotList.project === 'samba') assert.deepEqual(shotList.dashboardViews.map(shot => shot.dashboard), ['looker', 'tableau']);
      if (shotList.project === 'samba') {
        await video.evaluate(v=>new Promise(resolve=>{v.addEventListener('seeked',resolve,{once:true});v.currentTime=4.5;}));
        await video.screenshot({path:path.join(os.tmpdir(),'samba-inline-encoded.png')});
      }
      for (const time of times) {
        await video.evaluate((v, seek) => new Promise(resolve => {
          v.addEventListener('seeked', resolve, { once: true }); v.currentTime = seek;
        }), time);
        const buffer = await video.screenshot();
        frames.push({ label: `${path.basename(metadata[index].src)} / ${time.toFixed(1)}s`, src: buffer.toString('base64') });
      }
      assert.notEqual(frames[index * 4].src, frames[index * 4 + 1].src, 'Tour must show different scenes');
    }
    const sheet = await browser.newPage({ viewport: { width: 1600, height: 1900 } });
    await sheet.setContent(`<body style="margin:0;background:#222;color:#fff;font:14px monospace;display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${frames.map(frame => `<figure style="margin:0"><figcaption>${frame.label}</figcaption><img style="width:100%;display:block" src="data:image/png;base64,${frame.src}"></figure>`).join('')}</body>`);
    await sheet.screenshot({ path: path.join(os.tmpdir(), 'project-tour-contact-sheet.png'), fullPage: true });
    await sheet.close();

    await page.locator('video').evaluateAll(videos => videos.forEach(v => { v.controls = true; }));
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.ok(await tours.evaluateAll(videos => videos.every(v => {
        const box = v.getBoundingClientRect(), card = v.closest('.project-card').getBoundingClientRect();
        return box.width > 0 && box.left >= card.left && box.right <= card.right && Math.abs(box.width / box.height - 1.44) < 0.01;
      })));
      await page.locator('.project-card').nth(2).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(os.tmpdir(), `project-tours-${width}.png`) });
    }
    await page.setViewportSize({ width: 1440, height: 960 });
    for (const link of await page.locator('.project-open[href^="projects/"]').all()) {
      const popupPromise = page.waitForEvent('popup');
      await link.click();
      const popup = await popupPromise;
      await popup.waitForLoadState('domcontentloaded');
      assert.ok(popup.url().includes('/projects/'));
      assert.equal(page.url(), url, 'Portfolio stays open');
      await popup.close();
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify(metadata, null, 2));
    console.log('PASS: six decoded, advancing tours with zooms; 24 review frames; responsive framing at four widths; six project links open new tabs.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
