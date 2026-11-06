// scripts/backfill-item-branch.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Every deposit already records branchId + orderIds
  const deposits = await prisma.agentDeposit.findMany({
    select: { branchId: true, orderIds: true },
  });

  let updated = 0;
  for (const d of deposits) {
    if (!d.orderIds?.length) continue;
    const res = await prisma.orderItem.updateMany({
      where: {
        orderId: { in: d.orderIds },
        currentBranchId: null, // only touch ones still unset
      },
      data: { currentBranchId: d.branchId },
    });
    updated += res.count;
  }

  console.log(`Backfilled ${updated} items across ${deposits.length} deposits.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());