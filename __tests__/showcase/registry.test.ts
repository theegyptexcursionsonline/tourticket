import {
  ALLOWED_PROBE_HOSTS,
  ProbeUrlNotAllowedError,
  SHOWCASE_CAPABILITIES,
  assertAllowlistedProbeUrl,
  showcaseCapabilityById,
} from '@/lib/showcase/registry';

describe('showcase registry', () => {
  it('lists unique ids, a valid tier and a probe set consistent with the tier', () => {
    const ids = SHOWCASE_CAPABILITIES.map((capability) => capability.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const capability of SHOWCASE_CAPABILITIES) {
      expect(['accepted', 'preview']).toContain(capability.tier);
      if (capability.tier === 'accepted') {
        // An accepted capability without a probe could never be proven live.
        expect(capability.probes.length).toBeGreaterThan(0);
        expect(capability.href).toMatch(/^\/[a-z-]+$/);
      } else {
        // Previews carry no call to action and nothing to probe.
        // A preview capability never probes (nothing to claim live), but it may
        // still link to its page when one exists (/ai-voice ships ahead of the
        // EEO voice tenant being active again).
        expect(capability.probes).toHaveLength(0);
      }
    }
  });

  it('keeps every probe on the first-party allowlist over https with no query or credentials', () => {
    for (const capability of SHOWCASE_CAPABILITIES) {
      for (const target of capability.probes) {
        const url = new URL(target.url);
        expect(url.protocol).toBe('https:');
        expect(ALLOWED_PROBE_HOSTS.has(url.hostname)).toBe(true);
        expect(url.search).toBe('');
        expect(url.username).toBe('');
      }
    }
  });

  it.each([
    'https://evil.example.com/api/health',
    'https://voice.foxestechnology.com.evil.example/api/health',
    'http://voice.foxestechnology.com/api/health',
    'https://user:pw@voice.foxestechnology.com/api/health',
    'https://voice.foxestechnology.com/api/health?token=x',
    'https://voice.foxestechnology.com/api/health#frag',
    'not a url',
    '/api/version',
  ])('rejects %s', (url) => {
    expect(() => assertAllowlistedProbeUrl(url)).toThrow(ProbeUrlNotAllowedError);
  });

  it('accepts an allowlisted https url unchanged', () => {
    expect(assertAllowlistedProbeUrl('https://search.foxestechnology.com/api/version')).toBe(
      'https://search.foxestechnology.com/api/version',
    );
  });

  it('exposes the four showcased capabilities with the reviewed tiers', () => {
    // Preview until the EEO voice tenant is active again on the voice platform.
    expect(showcaseCapabilityById('ai-voice')?.tier).toBe('preview');
    expect(showcaseCapabilityById('ai-search')?.tier).toBe('accepted');
    expect(showcaseCapabilityById('online-booking')?.tier).toBe('accepted');
    expect(showcaseCapabilityById('mobile-apps')?.tier).toBe('preview');
    expect(showcaseCapabilityById('nope')).toBeUndefined();
  });
});
