-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "currentAgentId" TEXT;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "receivingNoteUploadedAt" TIMESTAMP(3),
ADD COLUMN     "receivingNoteUploadedBy" TEXT,
ADD COLUMN     "receivingNoteUploadedByName" TEXT,
ADD COLUMN     "receivingNoteUrl" TEXT;
