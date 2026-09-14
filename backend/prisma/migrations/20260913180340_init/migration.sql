-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SPECIALIST', 'MANAGER', 'ECAA', 'ADMIN');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING_MANAGER_APPROVAL', 'MANAGER_CHANGES_REQUESTED', 'MANAGER_APPROVED', 'WAITING_ECAA_APPROVAL', 'ECAA_CHANGES_REQUESTED', 'ECAA_APPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FleetKind" AS ENUM ('OWNED', 'ACMI');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingUserRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingUserRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING_MANAGER_APPROVAL',
    "saved" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "preparedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "managerApprovedBy" TEXT,
    "managerApprovedAt" TIMESTAMP(3),
    "managerActionBy" TEXT,
    "managerActionAt" TIMESTAMP(3),
    "managerNotes" TEXT,
    "managerQueueEnteredAt" TIMESTAMP(3),
    "ecaaActionBy" TEXT,
    "ecaaActionAt" TIMESTAMP(3),
    "ecaaNotes" TEXT,
    "approvalNumber" TEXT,
    "stampUploadedAt" TIMESTAMP(3),
    "data" JSONB NOT NULL DEFAULT '{}',
    "attachments" JSONB NOT NULL DEFAULT '{}',
    "notificationReads" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT,
    "requestId" TEXT NOT NULL,
    "formTitle" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetAircraft" (
    "id" TEXT NOT NULL,
    "kind" "FleetKind" NOT NULL,
    "type" TEXT NOT NULL,
    "registration" TEXT NOT NULL,

    CONSTRAINT "FleetAircraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialFleet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SpecialFleet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialFleetAircraft" (
    "id" TEXT NOT NULL,
    "specialFleetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "registration" TEXT NOT NULL,

    CONSTRAINT "SpecialFleetAircraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomesticAirport" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DomesticAirport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "esigApproved" BOOLEAN NOT NULL DEFAULT false,
    "companySignatureUrl" TEXT,
    "companySignatureName" TEXT,
    "companySignatureUploadedBy" TEXT,
    "companySignatureUploadedAt" TIMESTAMP(3),

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PendingUserRequest_email_key" ON "PendingUserRequest"("email");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE INDEX "Application_type_idx" ON "Application"("type");

-- CreateIndex
CREATE UNIQUE INDEX "FleetAircraft_kind_registration_key" ON "FleetAircraft"("kind", "registration");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialFleet_name_key" ON "SpecialFleet"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Country_nameEn_key" ON "Country"("nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "DomesticAirport_code_key" ON "DomesticAirport"("code");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialFleetAircraft" ADD CONSTRAINT "SpecialFleetAircraft_specialFleetId_fkey" FOREIGN KEY ("specialFleetId") REFERENCES "SpecialFleet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
