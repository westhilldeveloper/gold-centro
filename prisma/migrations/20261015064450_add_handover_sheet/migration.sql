-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "handoverSheetUploadedAt" TIMESTAMP(3),
ADD COLUMN     "handoverSheetUploadedBy" TEXT,
ADD COLUMN     "handoverSheetUploadedByName" TEXT,
ADD COLUMN     "handoverSheetUrl" TEXT;
