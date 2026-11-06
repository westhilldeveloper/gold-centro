-- AlterTable
ALTER TABLE "AgentCashTransaction" ADD COLUMN     "requestId" TEXT;

-- CreateTable
CREATE TABLE "AgentCashRequest" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "purpose" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentCashRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentCashRequest_agentId_idx" ON "AgentCashRequest"("agentId");

-- CreateIndex
CREATE INDEX "AgentCashRequest_branchId_idx" ON "AgentCashRequest"("branchId");

-- AddForeignKey
ALTER TABLE "AgentCashRequest" ADD CONSTRAINT "AgentCashRequest_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCashRequest" ADD CONSTRAINT "AgentCashRequest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
