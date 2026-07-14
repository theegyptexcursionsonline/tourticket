import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { getAbuseHashSecret, hashPrivacyKey } from '@/lib/security/distributedAbuseLimit';

export const BLOG_VISITOR_COOKIE = 'eeo_blog_like_visitor_v1';

function signature(visitorId: string): string {
  return createHmac('sha256', getAbuseHashSecret())
    .update(`blog-visitor-cookie\0${visitorId}`)
    .digest('base64url');
}

export function createBlogVisitorToken(): string {
  const visitorId = randomBytes(24).toString('base64url');
  return `${visitorId}.${signature(visitorId)}`;
}

export function verifyBlogVisitorToken(token: string | undefined): string | null {
  if (!token || token.length > 160) return null;
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;
  const visitorId = token.slice(0, separator);
  const suppliedSignature = token.slice(separator + 1);
  if (!/^[A-Za-z0-9_-]{24,80}$/.test(visitorId) || !/^[A-Za-z0-9_-]{32,80}$/.test(suppliedSignature)) {
    return null;
  }
  const expected = Buffer.from(signature(visitorId));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  return visitorId;
}

export function hashBlogVisitor(visitorId: string, tenantId: string): string {
  return hashPrivacyKey(`${tenantId}\0${visitorId}`, 'blog-like-visitor');
}
