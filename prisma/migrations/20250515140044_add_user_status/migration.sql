-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('Unknown', 'L1', 'L2', 'FraudSuspect');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'Unknown';
