import {readFileSync} from 'node:fs';
import {join} from 'node:path';

describe('mobile commerce deployment configuration', () => {
  it('includes the private bridge token in Netlify function environments', () => {
    const config = readFileSync(join(process.cwd(), 'netlify.toml'), 'utf8');

    expect(config).toMatch(/"MOBILE_COMMERCE_SERVICE_TOKEN"/);
  });
});
