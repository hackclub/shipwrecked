/*
  Warnings:

  - You are about to drop the column `rawHours` on the `Project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "HackatimeProjectLink" ADD COLUMN     "hoursOverride" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "rawHours";
