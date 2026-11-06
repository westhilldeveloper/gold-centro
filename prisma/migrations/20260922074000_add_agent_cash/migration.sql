-- CreateTable
CREATE TABLE "AgentCashTransaction" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "purpose" TEXT NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentCashTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentCashTransaction_agentId_idx" ON "AgentCashTransaction"("agentId");

-- AddForeignKey
ALTER TABLE "AgentCashTransaction" ADD CONSTRAINT "AgentCashTransaction_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
