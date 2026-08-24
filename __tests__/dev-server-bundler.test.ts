export {};
// Turbopack's dev runtime dies with "Maximum call stack size exceeded" in
// visitAsyncNode on some pages of this app (next@16.2.x): the dev server exits
// and the page never renders, while `next build` compiles the same route
// cleanly and webpack serves it fine. The dev script used to hardcode
// --turbopack, so the only local option was a crashing one.
const fs = require('fs');
const path = require('path');

const script: string = fs.readFileSync(
  path.join(__dirname, '..', 'scripts', 'dev-with-port.ts'),
  'utf8',
);

describe('dev server bundler choice', () => {
  it('still defaults to Turbopack', () => {
    expect(script).toContain("? '--webpack'");
    expect(script).toContain(": '--turbopack'");
  });

  it('offers a webpack escape hatch by flag and by env', () => {
    expect(script).toContain("process.argv.slice(2).includes('--webpack')");
    expect(script).toContain("process.env.NEXT_BUNDLER === 'webpack'");
  });

  it('does not hardcode the bundler in the spawn call', () => {
    expect(script).toContain("spawn('next', ['dev', bundler, '-p', port.toString()]");
    expect(script).not.toContain("['dev', '--turbopack', '-p'");
  });
});
