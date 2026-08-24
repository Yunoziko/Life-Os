-- New enum values must be committed before they can be used as defaults.
ALTER TYPE "AutomationRunStatus" ADD VALUE 'QUEUED';
ALTER TYPE "AutomationRunStatus" ADD VALUE 'WAITING';
