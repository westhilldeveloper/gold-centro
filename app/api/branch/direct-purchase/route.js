// D:\gold-centro\app\api\branch\direct-purchase\route.js
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { branchId, staffId, customer, items } = await req.json();

    if (!branchId || !staffId || !customer || !items?.length) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    let customerRecord = await prisma.user.findUnique({ where: { phone: customer.phone } });
    if (!customerRecord) {
      customerRecord = await prisma.user.create({
        data: { name: customer.name, phone: customer.phone, role: 'CUSTOMER', aadhaarNumber: customer.aadhaarNumber || null, panNumber: customer.panNumber || null, profilePhoto: customer.profilePhoto || null, aadhaarFront: customer.aadhaarFront || null, aadhaarBack: customer.aadhaarBack || null, panFront: customer.panFront || null }
      });
    } else {
      customerRecord = await prisma.user.update({
        where: { id: customerRecord.id },
        data: { aadhaarNumber: customer.aadhaarNumber || customerRecord.aadhaarNumber, panNumber: customer.panNumber || customerRecord.panNumber, profilePhoto: customer.profilePhoto || customerRecord.profilePhoto, aadhaarFront: customer.aadhaarFront || customerRecord.aadhaarFront, aadhaarBack: customer.aadhaarBack || customerRecord.aadhaarBack, panFront: customer.panFront || customerRecord.panFront }
      });
    }

    const totalPreGross = items.reduce((s, i) => s + parseFloat(i.preEstimationGrossWeight || 0), 0);

    const order = await prisma.order.create({
      data: {
        customerId: customerRecord.id,
        branchId,
        staffId,
        orderType: 'BRANCH_DIRECT',
        status: 'PENDING_ESTIMATE_AGREEMENT',
        weight: totalPreGross, // Temporarily store pre-gross
        purity: 'MIXED',
        estimatedTotal: 0,
        finalPrice: 0,
        depositedToBranch: false,
        items: {
          create: items.map(it => ({
            name: it.name,
            count: parseInt(it.count) || 1,
            purity: it.purity,
            imageUrls: it.imageUrls || [],
            preEstimationGrossWeight: parseFloat(it.preEstimationGrossWeight) || 0,
            // Post-estimation fields are null/zero for now
            grossWeight: 0, stoneWeight: 0, dustWeight: 0, netWeight: 0,  ratePerGram: parseFloat(it.ratePerGram) || 0, itemPrice: parseFloat(it.itemPrice) || 0,
            status: 'PENDING',
          }))
        }
      }
    });

    return NextResponse.json({ success: true, order });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}