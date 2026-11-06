-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "receiptAcknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "receiptAcknowledgedBy" TEXT,
ADD COLUMN     "signedDocumentUploadedAt" TIMESTAMP(3),
ADD COLUMN     "signedDocumentUploadedBy" TEXT,
ADD COLUMN     "signedDocumentUrl" TEXT;
