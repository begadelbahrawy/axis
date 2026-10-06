import { NextFunction, Request, Response } from 'express';
import { randomToken, timingSafeEqual } from '../lib/crypto';
import { env } from '../lib/env';

export const CSRF_COOKIE = 'axis_csrf';
export const CSRF_HEADER = 'x-csrf-token';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Double-submit-cookie CSRF protection. The cookie is readable by frontend JS
// (not httpOnly) so it can be echoed back as a header; a cross-site form or
// image tag can make the browser send the cookie automatically but cannot
// read it to set the header, so a forged mutating request is rejected even
// though it rides the victim's session cookie.
export function issueCsrfCookie(req: Request, res: Response, next: NextFunction) {
  if (!req.cookies?.[CSRF_COOKIE]) {
    res.cookie(CSRF_COOKIE, randomToken(24), {
      httpOnly: false,
      sameSite: 'lax',
      secure: env.nodeEnv === 'production',
      path: '/',
    });
  }
  next();
}

export function requireCsrf(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.header(CSRF_HEADER);
  if (!cookieToken || !headerToken || !timingSafeEqual(cookieToken, headerToken)) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token.' });
  }
  next();
}
