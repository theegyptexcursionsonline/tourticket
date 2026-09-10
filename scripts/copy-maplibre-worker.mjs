import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const packageRoot = path.dirname(require.resolve('maplibre-gl/package.json'));
const sourceDirectory = path.join(packageRoot, 'dist');
const destinationDirectory = path.join(process.cwd(), 'public', 'maplibre');
const runtimeFiles = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];

mkdirSync(destinationDirectory, { recursive: true });

for (const file of runtimeFiles) {
  copyFileSync(
    path.join(sourceDirectory, file),
    path.join(destinationDirectory, file),
  );
}
