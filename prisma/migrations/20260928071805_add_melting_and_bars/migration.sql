-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "meltingBatchId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "MeltingBatch" (
    "id" TEXT NOT NULL,
    "batchCode" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "itemIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "purity" TEXT NOT NULL,
    "totalInputWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalInputGross" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalBarWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentBy" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handledBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeltingBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoldBar" (
    "id" TEXT NOT NULL,
    "barCode" TEXT NOT NULL,
    "batchId" TEXT,
    "imageUrl" TEXT,
    "purity" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "handledBy" TEXT NOT NULL,
    "currentBranchId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoldBar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeltingBatch_batchCode_key" ON "MeltingBatch"("batchCode");

-- CreateIndex
CREATE INDEX "MeltingBatch_branchId_idx" ON "MeltingBatch"("branchId");

-- CreateIndex
CREATE INDEX "MeltingBatch_status_idx" ON "MeltingBatch"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GoldBar_barCode_key" ON "GoldBar"("barCode");

-- CreateIndex
CREATE INDEX "GoldBar_batchId_idx" ON "GoldBar"("batchId");

-- CreateIndex
CREATE INDEX "GoldBar_currentBranchId_idx" ON "GoldBar"("currentBranchId");

-- CreateIndex
CREATE INDEX "OrderItem_status_idx" ON "OrderItem"("status");

-- AddForeignKey
ALTER TABLE "MeltingBatch" ADD CONSTRAINT "MeltingBatch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoldBar" ADD CONSTRAINT "GoldBar_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "MeltingBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoldBar" ADD CONSTRAINT "GoldBar_currentBranchId_fkey" FOREIGN KEY ("currentBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
