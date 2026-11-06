-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "depositedAt" TIMESTAMP(3),
ADD COLUMN     "depositedToBranch" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AgentDeposit" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "purity" TEXT NOT NULL,
    "orderIds" TEXT[],
    "notes" TEXT,
    "receivedBy" TEXT NOT NULL,
    "depositedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentDeposit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AgentDeposit" ADD CONSTRAINT "AgentDeposit_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentDeposit" ADD CONSTRAINT "AgentDeposit_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
