/**
 * Measures how long the itinerary map takes to become usable on a cold load:
 * from navigation start to the moment the rendered route replaces the
 * "Loading route map…" placeholder.
 *
 *   node scripts/itinerary-map-firstload.mjs <label> <baseUrl>
 */
import { chromium, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const [, , label = 'local', baseUrl = 'http://localhost:3064'] = process.argv;
const SLUG = '/2-days-trip-cairo-from-sharm-el-sheikh-flight';
const OUT = path.join(process.cwd(), 'readiness-proof', '2026-08-20-itinerary-map-perf');
fs.mkdirSync(OUT, { recursive: true });

const results = [];

for (const name of ['mobile-390', 'desktop-1440']) {
  const isMobile = name.startsWith('mobile');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...(isMobile ? devices['iPhone 13'] : {}),
    viewport: isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile,
    hasTouch: isMobile,
  });
  const page = await context.newPage();
  const started = Date.now();
  await page.goto(baseUrl + SLUG, { waitUntil: 'domcontentloaded' });
  const domContentLoaded = Date.now() - started;

  // A customer reaches the itinerary by scrolling to it.
  await page.getByTestId('interactive-itinerary-map').scrollIntoViewIfNeeded();
  const scrolledAt = Date.now();

  await page.waitForFunction(() => {
    const card = document.querySelector('[data-testid="interactive-itinerary-map"]');
    return !!card && !card.textContent.includes('Loading route map') && !!card.querySelector('canvas');
  }, undefined, { timeout: 30000 });

  results.push({
    label,
    viewport: name,
    domContentLoadedMs: domContentLoaded,
    mapReadyAfterReachingItineraryMs: Date.now() - scrolledAt,
    mapReadyFromNavigationMs: Date.now() - started,
  });
  await browser.close();
}

fs.writeFileSync(path.join(OUT, `${label}-firstload.json`), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
