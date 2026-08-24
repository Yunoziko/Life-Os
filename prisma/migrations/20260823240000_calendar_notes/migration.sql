-- AlterTable
ALTER TABLE "Note" ADD COLUMN "goalId" TEXT;
ALTER TABLE "Note" ADD COLUMN "preview" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Note" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Note" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Note" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN "projectId" TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN "goalId" TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN "location" TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN "color" TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN "recurrence" TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN "reminderMinutes" INTEGER;

-- CreateIndex
CREATE INDEX "Note_userId_pinned_archived_idx" ON "Note"("userId", "pinned", "archived");
CREATE INDEX "Note_goalId_idx" ON "Note"("goalId");
CREATE INDEX "CalendarEvent_projectId_idx" ON "CalendarEvent"("projectId");
CREATE INDEX "CalendarEvent_goalId_idx" ON "CalendarEvent"("goalId");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill previews from existing note content
UPDATE "Note"
SET "preview" = LEFT(regexp_replace(trim("content"), '\s+', ' ', 'g'), 180)
WHERE "preview" = '' AND "content" <> '';
