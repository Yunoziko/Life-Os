-- AlterEnum
ALTER TYPE "GoalStatus" ADD VALUE 'NOT_STARTED';

-- CreateEnum
CREATE TYPE "GoalPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN "category" TEXT;
ALTER TABLE "Goal" ADD COLUMN "priority" "GoalPriority" NOT NULL DEFAULT 'MEDIUM';

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Habit" ADD COLUMN "goalId" TEXT;
ALTER TABLE "Habit" ADD COLUMN "description" TEXT;
ALTER TABLE "Habit" ADD COLUMN "target" TEXT;
ALTER TABLE "Habit" ADD COLUMN "startDate" TIMESTAMP(3);
ALTER TABLE "Habit" ADD COLUMN "endDate" TIMESTAMP(3);
ALTER TABLE "Habit" ADD COLUMN "paused" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "HabitLog" ADD COLUMN "value" INTEGER;

-- CreateIndex
CREATE INDEX "Goal_userId_priority_idx" ON "Goal"("userId", "priority");

-- CreateIndex
CREATE INDEX "Milestone_goalId_completed_idx" ON "Milestone"("goalId", "completed");

-- CreateIndex
CREATE INDEX "Milestone_userId_goalId_idx" ON "Milestone"("userId", "goalId");

-- CreateIndex
CREATE INDEX "Habit_goalId_idx" ON "Habit"("goalId");

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
