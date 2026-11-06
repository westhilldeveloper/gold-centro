-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "orderType" TEXT NOT NULL DEFAULT 'AGENT_PURCHASE',
ADD COLUMN     "purchaseAgreementUploadedAt" TIMESTAMP(3),
ADD COLUMN     "purchaseAgreementUrl" TEXT,
ADD COLUMN     "staffId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "preEstimationGrossWeight" DOUBLE PRECISION,
ADD COLUMN     "preEstimationNetWeight" DOUBLE PRECISION,
ADD COLUMN     "preEstimationPurity" TEXT;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "BranchStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
