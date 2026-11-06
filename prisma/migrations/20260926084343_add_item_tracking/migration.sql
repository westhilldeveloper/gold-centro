-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "currentBranchId" TEXT;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "itemIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "OrderItem_currentBranchId_idx" ON "OrderItem"("currentBranchId");
