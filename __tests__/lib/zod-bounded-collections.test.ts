/**
 * @jest-environment node
 */

// GHSA-mrhx-c7xc-m3w5: before zod 4.6.6 a size bound (.max(), .length(),
// .size()) was only checked after every element had been validated, so an
// oversized input built one issue per bad element and could exhaust memory.
// The patched validator rejects on the size alone. zod 4 still ships the old
// zod 3 code at `zod/v3`, which never received the fix and would pass the
// dependency audit unnoticed, so application code must not import it.

import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

const ROOT = path.join(__dirname, '..', '..');
const oversized = Array.from({ length: 20_000 }, (_, index) => index);

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(full);
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry.name)) yield full;
  }
}

describe('zod bounded collections', () => {
  it('rejects an oversized bounded array on its size, without validating each element', () => {
    const result = z.array(z.string()).max(3).safeParse(oversized);

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([expect.objectContaining({ code: 'too_big', maximum: 3 })]);
  });

  it('does the same for bounded sets and maps', () => {
    const set = z.set(z.string()).max(3).safeParse(new Set(oversized));
    const map = z.map(z.string(), z.string()).max(3).safeParse(new Map(oversized.map((n) => [n, n])));

    expect(set.error?.issues).toHaveLength(1);
    expect(map.error?.issues).toHaveLength(1);
  });

  it('is never imported through the unpatched zod/v3 entry point', () => {
    const offenders: string[] = [];
    for (const dir of ['app', 'components', 'contexts', 'hooks', 'lib', 'netlify', 'scripts', 'utils']) {
      const abs = path.join(ROOT, dir);
      if (!fs.existsSync(abs)) continue;
      for (const file of sourceFiles(abs)) {
        if (/['"]zod\/v3['"]/.test(fs.readFileSync(file, 'utf8'))) offenders.push(path.relative(ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
