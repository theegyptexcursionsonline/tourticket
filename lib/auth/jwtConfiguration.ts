export function assertJwtSecretConfigured(
  env: Record<string, string | undefined> = process.env,
): void {
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters in production.');
  }
}
