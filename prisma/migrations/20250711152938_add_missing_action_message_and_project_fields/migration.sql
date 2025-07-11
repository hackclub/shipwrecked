/*
  Warnings:

  - A unique constraint covering the columns `[airtableId]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "airtableId" TEXT,
ADD COLUMN     "hasRepoBadge" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "justification" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "identityToken" TEXT;

-- CreateTable
CREATE TABLE "ActionMessage" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "receipientId" TEXT NOT NULL,

    CONSTRAINT "ActionMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActionMessage_userId_idx" ON "ActionMessage"("userId");

-- CreateIndex
CREATE INDEX "ActionMessage_receipientId_idx" ON "ActionMessage"("receipientId");

-- CreateIndex
CREATE INDEX "ActionMessage_createdAt_idx" ON "ActionMessage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Project_airtableId_key" ON "Project"("airtableId");

-- AddForeignKey
ALTER TABLE "ActionMessage" ADD CONSTRAINT "ActionMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionMessage" ADD CONSTRAINT "ActionMessage_receipientId_fkey" FOREIGN KEY ("receipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
