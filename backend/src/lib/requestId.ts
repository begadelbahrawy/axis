import { prisma } from './prisma';
import { REQUEST_ID_PREFIX } from './constants';

// Mirrors generateRequestId(): {3-letter prefix}-{year}-{sequential number per type per year}
export async function generateRequestId(type: string): Promise<string> {
  const prefix = REQUEST_ID_PREFIX[type] || (type || 'GEN').slice(0, 3).toUpperCase();
  const year = new Date().getFullYear();
  const base = `${prefix}-${year}-`;
  const existing = await prisma.application.findMany({
    where: { id: { startsWith: base } },
    select: { id: true },
  });
  const usedSeqs = existing
    .map((r) => parseInt(r.id.slice(base.length), 10))
    .filter((n) => !isNaN(n));
  const nextSeq = (usedSeqs.length ? Math.max(...usedSeqs) : 0) + 1;
  return `${base}${String(nextSeq).padStart(3, '0')}`;
}
