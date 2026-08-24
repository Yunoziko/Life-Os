-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM (
  'PREFERENCE',
  'GOAL_CONTEXT',
  'PROJECT_CONTEXT',
  'ROUTINE',
  'DECISION',
  'IMPORTANT_CONTEXT',
  'WORKFLOW',
  'PERSONALIZATION'
);

CREATE TYPE "MemoryStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

CREATE TYPE "MemorySource" AS ENUM ('USER', 'AI', 'NOTE', 'TASK', 'PROJECT', 'CONVERSATION');

CREATE TYPE "MemoryImportance" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

CREATE TYPE "MemoryConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "memoryEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Memory" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "MemoryType" NOT NULL,
  "content" TEXT NOT NULL,
  "source" "MemorySource" NOT NULL DEFAULT 'USER',
  "importance" "MemoryImportance" NOT NULL DEFAULT 'MEDIUM',
  "confidence" "MemoryConfidence" NOT NULL DEFAULT 'HIGH',
  "status" "MemoryStatus" NOT NULL DEFAULT 'ACTIVE',
  "projectId" TEXT,
  "goalId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastUsedAt" TIMESTAMP(3),

  CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Memory_userId_status_idx" ON "Memory"("userId", "status");
CREATE INDEX "Memory_userId_type_status_idx" ON "Memory"("userId", "type", "status");
CREATE INDEX "Memory_userId_importance_lastUsedAt_idx" ON "Memory"("userId", "importance", "lastUsedAt");
CREATE INDEX "Memory_userId_projectId_idx" ON "Memory"("userId", "projectId");
CREATE INDEX "Memory_userId_goalId_idx" ON "Memory"("userId", "goalId");
CREATE INDEX "Memory_userId_createdAt_idx" ON "Memory"("userId", "createdAt");

ALTER TABLE "Memory" ADD CONSTRAINT "Memory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
