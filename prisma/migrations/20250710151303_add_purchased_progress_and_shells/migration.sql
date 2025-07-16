-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditLogEventType" ADD VALUE 'ShopOrderCreated';
ALTER TYPE "AuditLogEventType" ADD VALUE 'ShopOrderFulfilled';
ALTER TYPE "AuditLogEventType" ADD VALUE 'ShopOrderRejected';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "airtableId" TEXT,
ADD COLUMN     "hasRepoBadge" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "justification" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "identityToken" TEXT,
ADD COLUMN     "purchasedProgressHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalShellsSpent" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ActionMessage" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "receipientId" TEXT NOT NULL,

    CONSTRAINT "ActionMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfilledAt" TIMESTAMP(3),
    "fulfilledBy" TEXT,
    "config" JSONB,

    CONSTRAINT "ShopOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActionMessage_userId_idx" ON "ActionMessage"("userId");

-- CreateIndex
CREATE INDEX "ActionMessage_receipientId_idx" ON "ActionMessage"("receipientId");

-- CreateIndex
CREATE INDEX "ShopOrder_userId_idx" ON "ShopOrder"("userId");

-- CreateIndex
CREATE INDEX "ShopOrder_status_idx" ON "ShopOrder"("status");

-- AddForeignKey
ALTER TABLE "ActionMessage" ADD CONSTRAINT "ActionMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionMessage" ADD CONSTRAINT "ActionMessage_receipientId_fkey" FOREIGN KEY ("receipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOrder" ADD CONSTRAINT "ShopOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOrder" ADD CONSTRAINT "ShopOrder_fulfilledBy_fkey" FOREIGN KEY ("fulfilledBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
