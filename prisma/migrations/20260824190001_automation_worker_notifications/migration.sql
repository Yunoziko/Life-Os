-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
  'AUTOMATION_COMPLETED',
  'AUTOMATION_FAILED',
  'AUTOMATION_WAITING',
  'DAILY_BRIEF_READY',
  'WEEKLY_REVIEW_READY',
  'SYSTEM'
);

-- AlterTable
ALTER TABLE "Automation"
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN "pauseReason" TEXT;

CREATE INDEX "Automation_userId_createdAt_idx" ON "Automation"("userId", "createdAt");

UPDATE "Automation"
SET timezone = COALESCE(schedule->>'timeZone', 'UTC')
WHERE schedule IS NOT NULL;

-- AlterTable
ALTER TABLE "AutomationRun"
  ALTER COLUMN "status" SET DEFAULT 'QUEUED',
  ADD COLUMN "scheduledFor" TIMESTAMP(3),
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lockedAt" TIMESTAMP(3),
  ADD COLUMN "lockedBy" TEXT,
  ADD COLUMN "errorCategory" TEXT;

CREATE UNIQUE INDEX "AutomationRun_automationId_scheduledFor_key" ON "AutomationRun"("automationId", "scheduledFor");
CREATE INDEX "AutomationRun_status_availableAt_idx" ON "AutomationRun"("status", "availableAt");

-- AlterTable
ALTER TABLE "Notification"
  ADD COLUMN "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN "data" JSONB;

CREATE INDEX "Notification_userId_type_createdAt_idx" ON "Notification"("userId", "type", "createdAt");

-- CreateTable
CREATE TABLE "WorkerHeartbeat" (
  "id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'stopped',
  "lastTickAt" TIMESTAMP(3),
  "lastSuccessAt" TIMESTAMP(3),
  "queueDepth" INTEGER NOT NULL DEFAULT 0,
  "runningCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WorkerHeartbeat_pkey" PRIMARY KEY ("id")
);
