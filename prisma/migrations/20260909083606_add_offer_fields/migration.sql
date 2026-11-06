-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "adminOffer" DOUBLE PRECISION,
ADD COLUMN     "agentOffer" DOUBLE PRECISION,
ADD COLUMN     "comment" TEXT,
ADD COLUMN     "finalPrice" DOUBLE PRECISION;
