-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "isPledged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pledgeBankName" TEXT,
ADD COLUMN     "pledgeDeclarationUploadedAt" TIMESTAMP(3),
ADD COLUMN     "pledgeDeclarationUploadedBy" TEXT,
ADD COLUMN     "pledgeDeclarationUrl" TEXT,
ADD COLUMN     "pledgeLoanAccountNo" TEXT,
ADD COLUMN     "pledgeOutstandingAmount" DOUBLE PRECISION;
