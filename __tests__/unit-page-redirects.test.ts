/**
 * @jest-environment node
 */

// /ai-booking and /ai-search used to answer with the not-found page. Both
// products are shown on /assistants, in the visitor's language.
type Redirect = { source: string; destination: string; permanent: boolean };

async function redirects(): Promise<Redirect[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const config = require('../next.config');
  return config.redirects();
}

function resolve(rules: Redirect[], path: string): { destination: string; permanent: boolean } | null {
  for (const rule of rules) {
    const names: string[] = [];
    const pattern = rule.source.replace(/:([a-z]+)\(([^)]+)\)/g, (_, name: string, alternatives: string) => {
      names.push(name);
      return `(${alternatives})`;
    });
    if (/:[a-z]+\*/.test(pattern) || /:[a-z]+(?![a-z(])/.test(pattern)) continue;
    const match = new RegExp(`^${pattern}$`).exec(path);
    if (!match) continue;
    let destination = rule.destination;
    names.forEach((name, index) => {
      destination = destination.replace(`:${name}`, match[index + 1]);
    });
    return { destination, permanent: rule.permanent };
  }
  return null;
}

describe('assistant product addresses', () => {
  it.each([
    ['/ai-booking', '/assistants'],
    ['/ai-search', '/assistants'],
    ['/ar/ai-booking', '/ar/assistants'],
    ['/de/ai-search', '/de/assistants'],
    ['/en/ai-booking', '/en/assistants'],
  ])('sends %s to %s with a temporary redirect', async (path, destination) => {
    expect(resolve(await redirects(), path)).toEqual({ destination, permanent: false });
  });

  it('leaves the voice page and lookalike addresses alone', async () => {
    const rules = await redirects();
    expect(resolve(rules, '/ai-voice')).toBeNull();
    expect(resolve(rules, '/ai-booking-tips')).toBeNull();
    expect(resolve(rules, '/it/ai-booking')).toBeNull();
  });
});
