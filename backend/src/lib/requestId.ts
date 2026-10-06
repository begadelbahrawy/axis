import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { REQUEST_ID_PREFIX } from './constants';

// Atomically allocates the next sequence number for (type, year) using a single
// INSERT ... ON CONFLICT DO UPDATE ... RETURNING statement. Postgres applies
// row-level locking for this statement, so concurrent callers for the same
// (type, year) are serialized by the database itself — never two callers
// reading the same "current max" and computing the same "next" value (the bug
// a plain SELECT-then-INSERT approach has under concurrency), and nothing is
// allocated at all until this is actually called (i.e. only at Confirm &
// Generate — an abandoned preview never touches this table).
export async function allocateNextSequence(type: string, year: number): Promise<number> {
  const rows = await prisma.$queryRaw<{ lastValue: number }[]>(
    Prisma.sql`
      INSERT INTO "RequestSequence" (type, year, "lastValue")
      VALUES (${type}, ${year}, 1)
      ON CONFLICT (type, year)
      DO UPDATE SET "lastValue" = "RequestSequence"."lastValue" + 1
      RETURNING "lastValue"
    `,
  );
  return rows[0].lastValue;
}

// Mirrors generateRequestId(): {3-letter prefix}-{year}-{sequential number}
export async function generateRequestId(type: string): Promise<string> {
  const prefix = REQUEST_ID_PREFIX[type] || (type || 'GEN').slice(0, 3).toUpperCase();
  const year = new Date().getFullYear();
  const seq = await allocateNextSequence(type, year);
  return `${prefix}-${year}-${String(seq).padStart(3, '0')}`;
}
