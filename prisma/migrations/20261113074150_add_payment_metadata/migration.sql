-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentDetails" JSONB,
ADD COLUMN     "paymentReference" TEXT,
ADD COLUMN     "paymentStatus" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bankAccountName" TEXT,
ADD COLUMN     "bankAccountNo" TEXT,
ADD COLUMN     "bankIfsc" TEXT,
ADD COLUMN     "bankName" TEXT;
