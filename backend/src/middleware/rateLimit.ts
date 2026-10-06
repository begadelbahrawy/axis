import rateLimit from 'express-rate-limit';
import { env } from '../lib/env';

// Disabled only under NODE_ENV=test: the integration suite runs many
// unrelated requests from the same supertest agent IP within one process,
// which would otherwise trip this shared in-memory counter well before any
// individual test's own assertions are about it. Production behavior is
// unaffected. The login route's DB-backed lockout (lib/loginAttempts.ts) is
// exercised directly by its own tests regardless of this flag.
const skipInTests = () => env.isTest;

// In-memory, per-process limiters as the fast first line of defense. The
// login endpoint additionally checks a DB-backed attempt log (see
// lib/loginAttempts.ts) so brute-forcing survives a process restart, which a
// pure in-memory limiter would not catch. The DB-backed lockout (10 FAILED
// attempts per email+IP in 15 min) is the real brute-force defense; this
// in-memory cap is a coarser overall-throughput guard, sized generously
// because this key is per source IP and a busy office network commonly
// shares one outbound IP across many legitimate staff logging in at once.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { error: 'Too many login attempts. Please try again later.' },
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { error: 'Too many registration attempts. Please try again later.' },
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { error: 'Too many requests. Please try again later.' },
});
