-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('GOOGLE_CALENDAR', 'GMAIL', 'GITHUB');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('CONNECTED', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "ExternalSyncOrigin" AS ENUM ('IMPORTED', 'PUSHED');

-- AlterEnum
ALTER TYPE "CalendarEventSource" ADD VALUE 'GOOGLE';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "githubRepo" TEXT;

-- CreateTable
CREATE TABLE "IntegrationAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'CONNECTED',
    "accountLabel" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT,
    "tokenType" TEXT,
    "expiresAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalItemMapping" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "externalId" TEXT NOT NULL,
    "calendarId" TEXT,
    "lifeOSEventId" TEXT,
    "origin" "ExternalSyncOrigin" NOT NULL,
    "etag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalItemMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationAccount_userId_provider_key" ON "IntegrationAccount"("userId", "provider");
CREATE INDEX "IntegrationAccount_userId_status_idx" ON "IntegrationAccount"("userId", "status");
CREATE UNIQUE INDEX "ExternalItemMapping_lifeOSEventId_key" ON "ExternalItemMapping"("lifeOSEventId");
CREATE UNIQUE INDEX "ExternalItemMapping_userId_provider_externalId_key" ON "ExternalItemMapping"("userId", "provider", "externalId");
CREATE INDEX "ExternalItemMapping_userId_provider_idx" ON "ExternalItemMapping"("userId", "provider");
CREATE INDEX "ExternalItemMapping_integrationId_idx" ON "ExternalItemMapping"("integrationId");

-- AddForeignKey
ALTER TABLE "IntegrationAccount" ADD CONSTRAINT "IntegrationAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalItemMapping" ADD CONSTRAINT "ExternalItemMapping_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalItemMapping" ADD CONSTRAINT "ExternalItemMapping_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "IntegrationAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalItemMapping" ADD CONSTRAINT "ExternalItemMapping_lifeOSEventId_fkey" FOREIGN KEY ("lifeOSEventId") REFERENCES "CalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
