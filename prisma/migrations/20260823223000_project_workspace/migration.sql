-- AlterEnum
ALTER TYPE "ProjectStatus" ADD VALUE 'PLANNED';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "color" TEXT;
ALTER TABLE "Project" ADD COLUMN "icon" TEXT;
ALTER TABLE "Project" ADD COLUMN "startDate" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN "dueDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Task_userId_priority_idx" ON "Task"("userId", "priority");
