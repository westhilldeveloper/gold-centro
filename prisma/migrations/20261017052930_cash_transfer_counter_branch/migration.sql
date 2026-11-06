-- AlterTable
ALTER TABLE "BranchCashTransaction" ADD COLUMN     "counterBranchId" TEXT;

-- CreateIndex
CREATE INDEX "BranchCashTransaction_branchId_type_idx" ON "BranchCashTransaction"("branchId", "type");

-- AddForeignKey
ALTER TABLE "BranchCashTransaction" ADD CONSTRAINT "BranchCashTransaction_counterBranchId_fkey" FOREIGN KEY ("counterBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
