/*
  Warnings:

  - A unique constraint covering the columns `[hackatimeId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hackatimeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_hackatimeId_key" ON "User"("hackatimeId");
