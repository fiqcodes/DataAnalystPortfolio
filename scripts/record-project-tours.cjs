const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'assets/home/demos');
const viewport = { width: 1440, height: 1000 };
const projects = ['lalafood', 'thelook', 'segmentation', 'campaign', 'abc', 'samba'];

async function record(browser, id) {
  const scratch = mkdtempSync(path.join(tmpdir(), 'portfolio-tour-'));
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1,
    recordVideo: { dir: scratch, size: viewport } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const start = Date.now();
  let trimStart = 0;
  const closeups = [];
  const dashboardViews = [];
  const pause = (ms = 1500) => page.waitForTimeout(ms);
  const focus = async (selector, offset = 95) => {
    await page.locator(selector).first().evaluate((element, top) => {
      window.scrollTo({ top: scrollY + element.getBoundingClientRect().top - top, behavior: 'smooth' });
    }, offset);
    await pause(1500);
  };
  const point = async selector => {
    const target = page.locator(selector).first();
    const box = await target.boundingBox();
    if (!box) throw new Error(`Missing tour control: ${selector}`);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 24 });
    await pause(250);
    return target;
  };
  const click = async selector => { await (await point(selector)).click(); await pause(); };
  const select = async (selector, value) => {
    await (await point(selector)).selectOption(value);
    await pause();
  };
  const slider = async (selector, fraction) => {
    const target = await point(selector);
    const box = await target.boundingBox();
    await page.mouse.click(box.x + box.width * fraction, box.y + box.height / 2);
    await pause();
  };
  const closeup = async (selector, scale = 1.55, detailSelector) => {
    const target = page.locator(selector).first();
    let original = await target.boundingBox();
    if (!original || original.y >= viewport.height || original.y + original.height <= 0) {
      throw new Error(`Close-up target is outside the viewport: ${selector}`);
    }
    if (original.y < 110 || original.y + original.height > viewport.height - 60) {
      await focus(selector, Math.max(140, (viewport.height - original.height) / 2));
      original = await target.boundingBox();
    }
    // Leave room above the full plot for its heading/controls, and below for axis labels.
    scale = Math.min(scale, (viewport.width - 140) / original.width, (viewport.height - 260) / original.height);
    if (scale <= 1.03) throw new Error(`Chart needs a taller capture before zooming: ${selector}`);
    // Capture-only camera movement: preserve the article's layout and chart data.
    await target.evaluate(async (element, factor) => {
      const rect = element.getBoundingClientRect(), body = document.body.getBoundingClientRect();
      const x = rect.x + rect.width / 2;
      const y = rect.y + rect.height / 2;
      document.body.style.transformOrigin = `${x - body.x}px ${y - body.y}px`;
      window.tourCamera = document.body.animate([
        { transform: 'translate(0,0) scale(1)' },
        { transform: `translate(${innerWidth / 2 - x}px,${innerHeight / 2 + 50 - y}px) scale(${factor})` }
      ], { duration: 1200, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
      await window.tourCamera.finished;
    }, scale);
    const enlarged = await target.boundingBox();
    if (Math.abs(enlarged.width / original.width - scale) > 0.02) throw new Error('Camera zoom did not apply');
    if (enlarged.x < 35 || enlarged.y < 100 || enlarged.x + enlarged.width > viewport.width - 35 || enlarged.y + enlarged.height > viewport.height - 50) {
      throw new Error(`Zoom would crop the chart: ${selector}`);
    }
    await pause(400);
    if (detailSelector) await point(detailSelector);
    closeups.push({ selector, scale, time: (Date.now() - start) / 1000 - trimStart });
    await page.screenshot({ path: path.join(tmpdir(), `tour-zoom-${id}-${closeups.length}.png`) });
    await pause(2100);
    await page.evaluate(async () => {
      window.tourCamera.reverse();
      await window.tourCamera.finished;
      window.tourCamera.cancel();
      document.body.style.removeProperty('transform-origin');
      delete window.tourCamera;
    });
    await pause(700);
  };
  const poster = async () => {
    await page.mouse.move(1240, 680, { steps: 12 });
    await pause(350);
    await page.screenshot({ path: path.join(output, `${id}.jpg`), type: 'jpeg', quality: 88 });
  };
  try {
    await page.goto(pathToFileURL(path.join(root, `projects/${id}/index.html`)).href);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
      // The pointer is capture-only; no overlay is added to the published articles.
      const cursor = document.createElement('div');
      cursor.id = 'tour-pointer';
      cursor.style.cssText = 'position:fixed;left:-50px;top:-50px;width:16px;height:16px;border:2px solid #fff;border-radius:50%;background:#17202bcc;box-shadow:0 0 0 1px #17202b;pointer-events:none;z-index:2147483647;transform:translate(-50%,-50%)';
      document.documentElement.append(cursor);
      addEventListener('mousemove', event => { cursor.style.left = event.clientX + 'px'; cursor.style.top = event.clientY + 'px'; });
      addEventListener('mousedown', () => cursor.style.background = '#f1c40f');
      addEventListener('mouseup', () => cursor.style.background = '#17202bcc');
    });
    trimStart = (Date.now() - start) / 1000 + 0.25;
    await pause(2300);
    if (id === 'lalafood') {
      await focus('#section-audience', 145);
      await click('#visual-stage button[value="cuisine"]');
      await select('#visual-stage select[data-control="sample"]', '1000');
      await focus('#section-shap', 145);
      await select('#visual-stage select[data-control="category"]', 'Promotion');
      await poster();
      await closeup('#visual-stage [data-ui="chart"]', 1.55);
      await focus('#section-retention', 145);
      await click('#visual-stage button[value="matrix"]');
      await closeup('#visual-stage .heat-table', 1.55, '#visual-stage tbody tr:nth-child(3) td:nth-child(4) button');
      await click('#visual-stage tbody button');
    } else if (id === 'thelook') {
      await focus('#growth');
      await click('[data-metric="profitGrowth"]');
      await click('#rank-sort');
      await focus('#portfolio');
      await click('[data-focus="Invest"]');
      await poster();
      await closeup('#portfolio-chart', 1.5);
      await focus('#retention');
      // Fit the horizontally scrollable table for this recording so M0-M11 stay visible.
      await page.locator('#cohort-grid').evaluate(grid => {
        grid.style.zoom = Math.min(1, grid.parentElement.clientWidth / grid.scrollWidth);
      });
      await focus('#retention .cohort-figure', 110);
      await click('[data-cohort-view="count"]');
      await click('[data-cohort-view="rate"]');
      await closeup('#cohort-grid', 1.6, '#cohort-grid button[data-cohort="2"][data-month="2"]');
      await click('#cohort-grid button[data-cohort="2"][data-month="2"]');
    } else if (id === 'segmentation') {
      await focus('#clustering');
      await focus('#kmeans-k', 130);
      await select('#kmeans-k', '3');
      await click('#kmeans-next');
      await click('#kmeans-next');
      await click('#kmeans-next');
      await poster();
      await closeup('#kmeans-chart', 1.5);
      await focus('#segments');
      await focus('#segment-selector', 115);
      await click('#segment-selector button:last-child');
      await select('#segment-metric', 'churn');
      await closeup('#segment-chart', 1.5);
      await focus('#economics');
      await focus('#economics-segment', 140);
      await slider('#churn-reduction', 0.6);
    } else if (id === 'campaign') {
      await focus('#sales-chart', 180);
      await click('[data-measure="total"]');
      await click('[data-measure="mean"]');
      await poster();
      await closeup('#sales-chart', 1.35);
      await focus('#comparison', 110);
      await select('#comparison', '0');
      await click('[data-analysis="store"]');
      await click('#holm');
      await focus('#age-market', 110);
      await select('#age-market', 'Large');
      await closeup('#age-chart', 1.4);
    } else if (id === 'abc') {
      await focus('#price-title', 100);
      await slider('#budget', 0.42);
      await click('[data-scale="linear"]');
      await click('[data-scale="log"]');
      await focus('#tier', 110);
      await select('#tier', 'all');
      await select('#group', 'type');
      await poster();
      await closeup('#market-bars', 1.5, '#market-bars button:nth-child(3)');
      await click('#market-bars button:nth-child(3)');
      await focus('#relationship-title', 100);
      await select('#feature', 'bathrooms');
      await click('[data-view="residual"]');
      await closeup('#scatter-chart', 1.4);
    } else if (id === 'samba') {
      await focus('.dashboard-frame', 100);
      for (const dashboard of ['looker', 'tableau']) {
        await click(`[data-dashboard="${dashboard}"]`);
        await page.locator('.dashboard-frame').evaluate(frame => {
          const bounds = frame.getBoundingClientRect();
          if (bounds.top < 60 || bounds.bottom > innerHeight - 30) {
            throw new Error('Inline dashboard panel is cut off in the recording');
          }
        });
        await click('#expand-dashboard');
        await page.locator('#zoom-image').evaluate(async image => {
          await image.decode();
          const frame = document.getElementById('zoom-viewport').getBoundingClientRect();
          const bounds = image.getBoundingClientRect();
          if (bounds.left < frame.left || bounds.right > frame.right + 1 || bounds.top < frame.top || bounds.bottom > frame.bottom + 1) {
            throw new Error('Samba dashboard is cropped in its fitted view');
          }
          if (document.getElementById('zoom-level').value !== '100%') throw new Error('Dashboard must stay at fit size');
        });
        dashboardViews.push({ dashboard, time: (Date.now() - start) / 1000 - trimStart });
        await page.screenshot({ path: path.join(tmpdir(), `tour-samba-${dashboard}-full.png`) });
        if (dashboard === 'looker') await poster();
        await pause(2500);
        await click('#close-dashboard');
      }
      await focus('#momentum');
      await focus('#trend-chart', 180);
      await click('[data-trend="payment"]');
      await click('[data-trend="aov"]');
      await closeup('#trend-chart', 1.5);
    }
    await pause(1500);
    if (errors.length) throw new Error(errors.join('\n'));
    const video = page.video();
    await context.close();
    const raw = await video.path();
    execFileSync(process.env.FFMPEG_PATH || 'ffmpeg', [
      '-y', '-ss', String(trimStart), '-i', raw, '-an', '-c:v', 'libvpx', '-crf', '10',
      '-b:v', '1400k', '-deadline', 'good', '-cpu-used', '4', path.join(output, `${id}.webm`)
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    writeFileSync(path.join(output, `${id}.tour.json`), JSON.stringify({ project: id, viewport, closeups, ...(dashboardViews.length ? { dashboardViews } : {}) }, null, 2) + '\n');
    console.log(`${id}: tour and poster saved`);
  } finally {
    await context.close();
    rmSync(scratch, { recursive: true, force: true });
  }
}

(async () => {
  mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    for (const id of process.argv.slice(2).length ? process.argv.slice(2) : projects) {
      if (!projects.includes(id)) throw new Error(`Unknown project: ${id}`);
      await record(browser, id);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
