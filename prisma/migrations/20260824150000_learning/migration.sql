-- CreateEnum
CREATE TYPE "LearningStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LearningType" AS ENUM ('COURSE', 'BOOK', 'ARTICLE', 'VIDEO', 'PODCAST', 'OTHER');

-- CreateTable
CREATE TABLE "LearningItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "LearningType" NOT NULL DEFAULT 'COURSE',
    "status" "LearningStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "url" TEXT,
    "provider" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "targetDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningItem_userId_status_idx" ON "LearningItem"("userId", "status");
CREATE INDEX "LearningItem_goalId_idx" ON "LearningItem"("goalId");
CREATE INDEX "LearningItem_projectId_idx" ON "LearningItem"("projectId");

-- AddForeignKey
ALTER TABLE "LearningItem" ADD CONSTRAINT "LearningItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningItem" ADD CONSTRAINT "LearningItem_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LearningItem" ADD CONSTRAINT "LearningItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
