/*
  Warnings:

  - You are about to drop the column `rate22k` on the `GoldRate` table. All the data in the column will be lost.
  - You are about to drop the column `rate24k` on the `GoldRate` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `OrderItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GoldRate" DROP COLUMN "rate22k",
DROP COLUMN "rate24k",
ADD COLUMN     "rates" JSONB,
ADD COLUMN     "serviceChargePercent" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "imageUrl",
ADD COLUMN     "dustWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "stoneWeight" DOUBLE PRECISION NOT NULL DEFAULT 0;
