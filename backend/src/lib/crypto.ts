import crypto from 'crypto';

// Random URL-safe token (used for password-reset links and CSRF tokens).
export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

// One-way hash for storing password-reset tokens: the raw token is emailed to
// the user and never persisted, only this hash, so a leaked DB row can't be
// replayed as a valid reset link.
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
