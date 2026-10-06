// Seeds only the first Admin account (from env vars) plus default reference
// (master) data. No demo accounts and no demo applications are ever created —
// per the build spec, Section 4.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  COUNTRIES_SEED,
  DOMESTIC_AIRPORTS_SEED,
  OWNED_FLEET_SEED,
  ACMI_FLEET_SEED,
} from '../src/lib/constants';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminName = process.env.SEED_ADMIN_NAME || 'System Administrator';

  if (!adminEmail || !adminPassword) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set (see .env.example) before seeding.');
  }
  if (adminPassword.length < 6) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 6 characters.');
  }

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail.toLowerCase() } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: { name: adminName, email: adminEmail.toLowerCase(), passwordHash, role: 'ADMIN', active: true },
    });
    console.log(`Created first Admin account: ${adminEmail}`);
  } else {
    console.log('Admin account already exists, skipping.');
  }

  await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', esigApproved: false },
  });

  if ((await prisma.country.count()) === 0) {
    await prisma.country.createMany({
      data: COUNTRIES_SEED.map(([en, ar], i) => ({ nameEn: en, nameAr: ar, order: i })),
    });
    console.log(`Seeded ${COUNTRIES_SEED.length} countries.`);
  }

  if ((await prisma.domesticAirport.count()) === 0) {
    await prisma.domesticAirport.createMany({
      data: DOMESTIC_AIRPORTS_SEED.map(([code, name], i) => ({ code, name, order: i })),
    });
    console.log(`Seeded ${DOMESTIC_AIRPORTS_SEED.length} domestic airports.`);
  }

  if ((await prisma.fleetAircraft.count()) === 0) {
    const owned = Object.entries(OWNED_FLEET_SEED).flatMap(([type, regs]) =>
      regs.map((registration) => ({ kind: 'OWNED' as const, type, registration })),
    );
    const acmi = Object.entries(ACMI_FLEET_SEED).flatMap(([type, regs]) =>
      regs.map((registration) => ({ kind: 'ACMI' as const, type, registration })),
    );
    await prisma.fleetAircraft.createMany({ data: [...owned, ...acmi] });
    console.log(`Seeded ${owned.length} owned + ${acmi.length} ACMI aircraft.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
