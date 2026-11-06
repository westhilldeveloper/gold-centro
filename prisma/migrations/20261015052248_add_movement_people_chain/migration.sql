-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "carrierId" TEXT,
ADD COLUMN     "carrierName" TEXT,
ADD COLUMN     "carrierPhone" TEXT,
ADD COLUMN     "carrierType" TEXT,
ADD COLUMN     "handedOverByName" TEXT,
ADD COLUMN     "handedOverByPhone" TEXT,
ADD COLUMN     "receivedByName" TEXT;
