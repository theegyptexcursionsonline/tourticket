import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const issuer = 'urn:tourticket:issuer';
const audience = 'urn:tourticket:audience';

export async function signToken(payload: any, options?: { expiresIn?: string }) {
  const expiresAt = options?.expiresIn || '2h';
  
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime(expiresAt)
    .sign(secret);
  return token;
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer,
      audience,
    });
    return payload;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}