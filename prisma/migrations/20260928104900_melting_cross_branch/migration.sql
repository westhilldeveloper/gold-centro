-- DropForeignKey
ALTER TABLE "MeltingBatch" DROP CONSTRAINT "MeltingBatch_branchId_fkey";

-- DropIndex
DROP INDEX "MeltingBatch_branchId_idx";

-- AlterTable
ALTER TABLE "MeltingBatch" ADD COLUMN     "fromBranchIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "branchId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "MeltingBatch" ADD CONSTRAINT "MeltingBatch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
