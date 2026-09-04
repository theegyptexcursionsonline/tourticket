import { assertJwtSecretConfigured } from '@/lib/auth/jwtConfiguration';

describe('customer JWT production configuration', () => {
  it('accepts a key with the required minimum entropy length', () => {
    expect(() => assertJwtSecretConfigured({ JWT_SECRET: 'x'.repeat(32) })).not.toThrow();
  });

  it.each([undefined, '', 'x'.repeat(31)])('rejects a missing or short key', (JWT_SECRET) => {
    expect(() => assertJwtSecretConfigured({ JWT_SECRET })).toThrow(
      'JWT_SECRET must be configured with at least 32 characters in production.',
    );
  });
});
