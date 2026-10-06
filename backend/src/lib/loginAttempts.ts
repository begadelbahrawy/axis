import { prisma } from './prisma';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 10;

// DB-backed sliding-window lockout per email+IP. Persists across process
// restarts, unlike the in-memory express-rate-limit layer in front of it.
export async function isLockedOut(email: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const failedCount = await prisma.loginAttempt.count({
    where: { email, ip, success: false, createdAt: { gte: since } },
  });
  return failedCount >= MAX_FAILED_ATTEMPTS;
}

export async function recordLoginAttempt(email: string, ip: string, success: boolean, userId?: string) {
  await prisma.loginAttempt.create({ data: { email, ip, success, userId } });
}
