-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "hasMetrics" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metricsCompleted" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "metricsCompletionTime" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "metricsOverdue" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "metricsProgress" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "metricsWorkload" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "projectType" TEXT NOT NULL DEFAULT 'PROJECT';

