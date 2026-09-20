// One-off data migration for two behavior changes:
//  1) flight-row `remarks` (single PAX/POS/FRY value) -> split into
//     remarksOut/remarksRet (simple-style rows) or remarksDep/remarksArr
//     (wide-style rows), each copying the old single value so existing
//     applications keep behaving as "same purpose both ways".
//  2) Travel Program `acType` (single value) -> `acTypes` (array),
//     wrapping the existing value into a one-item list.
//
// Application rows/travelProgram live in the `data` JSON column (see
// schema.prisma), so this is a data migration rather than a SQL schema
// migration. Safe to re-run — it only touches rows still on the old shape.
//
// Usage: npx tsx prisma/migrate-remarks-actypes.ts

import { PrismaClient } from '@prisma/client';
import { FORM_TYPES } from '../src/lib/constants';

const prisma = new PrismaClient();

function migrateRow(row: any, style: 'simple' | 'wide'): boolean {
  if (!row || typeof row !== 'object' || !('remarks' in row)) return false;
  const value = row.remarks ?? 'PAX';
  if (style === 'wide') {
    row.remarksDep = value;
    row.remarksArr = value;
  } else {
    row.remarksOut = value;
    row.remarksRet = value;
  }
  delete row.remarks;
  return true;
}

async function main() {
  const applications = await prisma.application.findMany();
  let touched = 0;

  for (const app of applications) {
    const data = (app.data as any) || {};
    const style = FORM_TYPES[app.type]?.style || 'simple';
    let changed = false;

    (data.rows || []).forEach((row: any) => {
      if (migrateRow(row, style)) changed = true;
    });
    (data.countrySections || []).forEach((sec: any) => {
      (sec.rows || []).forEach((row: any) => {
        if (migrateRow(row, 'simple')) changed = true;
      });
    });
    if (data.travelProgram && data.travelProgram.acType && !data.travelProgram.acTypes) {
      data.travelProgram.acTypes = [data.travelProgram.acType];
      delete data.travelProgram.acType;
      changed = true;
    }

    if (changed) {
      await prisma.application.update({ where: { id: app.id }, data: { data } });
      touched++;
    }
  }

  console.log(`Migrated ${touched} of ${applications.length} application(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
