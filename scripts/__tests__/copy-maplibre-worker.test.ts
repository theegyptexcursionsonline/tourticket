import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

describe('MapLibre runtime asset preparation', () => {
  it('copies the matching ESM worker and shared module into the public directory', () => {
    const repositoryRoot = process.cwd();
    const scriptPath = path.join(repositoryRoot, 'scripts', 'copy-maplibre-worker.mjs');
    const packageRoot = path.dirname(require.resolve('maplibre-gl/package.json'));
    const files = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];

    execFileSync(process.execPath, [scriptPath], { cwd: repositoryRoot });

    for (const file of files) {
      const source = fs.readFileSync(path.join(packageRoot, 'dist', file));
      const publicAsset = fs.readFileSync(path.join(repositoryRoot, 'public', 'maplibre', file));
      expect(publicAsset.equals(source)).toBe(true);
    }
  });
});
