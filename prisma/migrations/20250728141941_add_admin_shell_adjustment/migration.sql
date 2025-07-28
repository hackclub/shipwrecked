/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `ActionMessage` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[airtableId]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ShopItemCostType" AS ENUM ('fixed', 'config');

-- AlterEnum
ALTER TYPE "AuditLogEventType" ADD VALUE 'ShellModification';

-- AlterTable
ALTER TABLE "ActionMessage" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adminShellAdjustment" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ShopItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT,
    "price" INTEGER NOT NULL,
    "usdCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costType" "ShopItemCostType" NOT NULL DEFAULT 'fixed',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "useRandomizedPricing" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopItem_active_idx" ON "ShopItem"("active");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalConfig_key_key" ON "GlobalConfig"("key");

-- CreateIndex
CREATE INDEX "ActionMessage_createdAt_idx" ON "ActionMessage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Project_airtableId_key" ON "Project"("airtableId");
