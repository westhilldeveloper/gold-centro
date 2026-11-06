// D:\gold-centro\app\api\branch\direct-purchase\route.js
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { branchId, staffId, customer, items, finalPrice, paymentMode } = body;

    if (!branchId || !staffId || !customer || !items?.length) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Find or Create Customer
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

    const totalNet = items.reduce((s, i) => s + parseFloat(i.netWeight), 0);

    // 2. Create Order (PENDING AGREEMENT)
    const order = await prisma.order.create({
      data: {
        customerId: customerRecord.id,
        branchId,
        staffId,
        orderType: 'BRANCH_DIRECT',
        status: 'PENDING_AGREEMENT', // Awaiting signed doc
        weight: totalNet,
        purity: 'MIXED',
        estimatedTotal: finalPrice,
        finalPrice,
        paymentMode,
        depositedToBranch: false,
        items: {
          create: items.map(it => ({
            name: it.name,
            count: parseInt(it.count) || 1,
            purity: it.purity,
            grossWeight: parseFloat(it.grossWeight),
            stoneWeight: parseFloat(it.stoneWeight || 0),
            dustWeight: parseFloat(it.dustWeight || 0),
            netWeight: parseFloat(it.netWeight),
            ratePerGram: parseFloat(it.ratePerGram),
            itemPrice: parseFloat(it.itemPrice),
            imageUrls: it.imageUrls || [],
            preEstimationGrossWeight: it.preEstimationGrossWeight ? parseFloat(it.preEstimationGrossWeight) : null,
            preEstimationNetWeight: it.preEstimationNetWeight ? parseFloat(it.preEstimationNetWeight) : null,
            preEstimationPurity: it.preEstimationPurity || null,
            status: 'PENDING', // Not added to stock yet
          }))
        }
      }
    });

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Create direct purchase error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}