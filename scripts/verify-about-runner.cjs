const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
const {chromium} = require('playwright');

(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('.about-copy > p').count(), 2);
    for (const width of [320, 390, 1440, 1920, 2560, 3840, 390]) {
      await page.setViewportSize({width, height:900});
      await page.waitForFunction(() => {
        const runner = document.querySelector('.about-runner');
        return [...runner.querySelectorAll('.runner-landscape, .runner-clouds')].every(track =>
          track.children.length === Math.ceil(runner.clientWidth / 1200) + 1);
      });
      for (const phase of [0, .25, .5, .9999, 1]) {
        const result = await page.evaluate(phase => {
          const runner = document.querySelector('.about-runner');
          const bounds = runner.getBoundingClientRect();
          return [...runner.querySelectorAll('.runner-landscape, .runner-clouds')].map(track => {
            const animation = track.getAnimations()[0];
            animation.pause();
            animation.currentTime = animation.effect.getTiming().duration * phase;
            const tiles = [...track.children].map(tile => tile.getBoundingClientRect());
            return tiles[0].left <= bounds.left + 1 && tiles.at(-1).right >= bounds.right - 1
              && tiles.every((tile, i) => !i || Math.abs(tile.left - tiles[i - 1].right) < 1);
          });
        }, phase);
        assert.ok(result.every(Boolean), `Scenery gap at ${width}px, phase ${phase}`);
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}px`);
      if ([390, 1920].includes(width)) {
        await page.locator('#about').screenshot({path:path.join(require('node:os').tmpdir(), `about-fixed-${width}.png`)});
      }
    }
    console.log('PASS: two About paragraphs; gap-free ground/cloud tiles at five loop phases across six widths and resize back to mobile.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
