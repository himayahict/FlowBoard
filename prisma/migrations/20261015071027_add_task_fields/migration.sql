-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "assignee" TEXT NOT NULL DEFAULT 'SH',
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'Medium',
ALTER COLUMN "status" SET DEFAULT 'To Do';
