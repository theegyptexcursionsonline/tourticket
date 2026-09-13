import { expect, test } from '@playwright/test';

const MAPLIBRE_RUNTIME_FILES = [
  '/maplibre/maplibre-gl-worker.mjs',
  '/maplibre/maplibre-gl-shared.mjs',
];

test('serves a loadable MapLibre 6 worker and its shared module', async ({ page, request }) => {
  for (const assetPath of MAPLIBRE_RUNTIME_FILES) {
    const response = await request.get(assetPath);
    expect(response.status(), `${assetPath} should be served`).toBe(200);
    expect(response.headers()['content-type']).toContain('javascript');
  }

  const failedRuntimeRequests: string[] = [];
  page.on('requestfailed', (request) => {
    if (request.url().includes('/maplibre/')) failedRuntimeRequests.push(request.url());
  });

  await page.goto('/robots.txt');
  const workerResult = await page.evaluate(async (workerUrl) => {
    return new Promise<{ ok: boolean; message?: string }>((resolve) => {
      const worker = new Worker(workerUrl, { type: 'module' });
      const timer = window.setTimeout(() => {
        worker.terminate();
        resolve({ ok: true });
      }, 750);

      worker.addEventListener('error', (event) => {
        window.clearTimeout(timer);
        worker.terminate();
        resolve({ ok: false, message: event.message });
      }, { once: true });
    });
  }, MAPLIBRE_RUNTIME_FILES[0]);

  expect(workerResult).toEqual({ ok: true });
  expect(failedRuntimeRequests).toEqual([]);
});
