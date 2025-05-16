-- CreateEnum
CREATE TYPE "ReviewRequestType" AS ENUM ('ShippedApproval', 'ViralApproval', 'HoursApproval', 'Other');

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "reviewType" "ReviewRequestType";
