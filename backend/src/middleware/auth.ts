import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';

export type Role = 'SPECIALIST' | 'MANAGER' | 'ECAA' | 'ADMIN';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email: string; name: string; role: Role };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.axis_token as string | undefined;
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) return res.status(401).json({ error: 'Account not found or deactivated.' });
    req.user = { id: user.id, email: user.email, name: user.name, role: user.role as Role };
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
}

// Role helpers — mirror isManager()/isECAA()/isAdmin()/canEditApplications()/etc. exactly.
export const isManagerRole = (role: Role) => role === 'MANAGER' || role === 'ADMIN';
export const isAdminRole = (role: Role) => role === 'ADMIN';
export const isEcaaRole = (role: Role) => role === 'ECAA';
export const isSpecialistRole = (role: Role) => role === 'SPECIALIST';
export const canEditApplicationsRole = (role: Role) => ['SPECIALIST', 'MANAGER', 'ADMIN'].includes(role);
export const canManageReferenceDataRole = (role: Role) => ['SPECIALIST', 'MANAGER', 'ADMIN'].includes(role);
export const canPrintApplicationRole = (role: Role) => ['SPECIALIST', 'MANAGER', 'ADMIN'].includes(role);
export const canUploadEcaaApprovalRole = (role: Role) => ['SPECIALIST', 'MANAGER', 'ADMIN'].includes(role);

export function requireRole(check: (role: Role) => boolean, message: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !check(req.user.role)) return res.status(403).json({ error: message });
    next();
  };
}

export const requireAdmin = requireRole(isAdminRole, 'Admin access required.');
export const requireManager = requireRole(isManagerRole, 'Manager access required.');
export const requireEcaa = requireRole(isEcaaRole, 'ECAA access required.');
export const requireCanEdit = requireRole(canEditApplicationsRole, 'Specialist, Manager or Admin access required.');
