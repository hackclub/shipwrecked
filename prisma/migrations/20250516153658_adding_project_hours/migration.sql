/*
  Warnings:

  - You are about to drop the column `approved` on the `Project` table. All the data in the column will be lost.
  - Added the required column `rawHours` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Project" DROP COLUMN "approved",
ADD COLUMN     "hoursOverride" DOUBLE PRECISION,
ADD COLUMN     "rawHours" DOUBLE PRECISION NOT NULL DEFAULT 0;
