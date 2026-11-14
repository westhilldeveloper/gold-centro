// D:\gold-centro\app\api\branch\direct-purchase\route.js
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { branchId, staffId, customer, items } = body;

    if (!branchId || !staffId || !customer?.phone || !items?.length) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields (branchId, staffId, customer.phone, items)' },
        { status: 400 }
      );
    }

    // 1. Find or create customer
    let customerRecord = await prisma.user.findUnique({
      where: { phone: customer.phone },
    });

    if (!customerRecord) {
      customerRecord = await prisma.user.create({
        data: {
          name: customer.name,
          phone: customer.phone,
          role: 'CUSTOMER',
          aadhaarNumber: customer.aadhaarNumber || null,
          panNumber: customer.panNumber || null,
          profilePhoto: customer.profilePhoto || null,
          aadhaarFront: customer.aadhaarFront || null,
          aadhaarBack: customer.aadhaarBack || null,
          panFront: customer.panFront || null,
        },
      });
    } else {
      customerRecord = await prisma.user.update({
        where: { id: customerRecord.id },
        data: {
          name: customer.name || customerRecord.name,
          aadhaarNumber: customer.aadhaarNumber || customerRecord.aadhaarNumber,
          panNumber: customer.panNumber || customerRecord.panNumber,
          profilePhoto: customer.profilePhoto || customerRecord.profilePhoto,
          aadhaarFront: customer.aadhaarFront || customerRecord.aadhaarFront,
          aadhaarBack: customer.aadhaarBack || customerRecord.aadhaarBack,
          panFront: customer.panFront || customerRecord.panFront,
        },
      });
    }

    // 2. Compute pre-estimation totals only
    const totalPreGross = items.reduce(
      (sum, i) => sum + (parseFloat(i.preEstimationGrossWeight) || 0),
      0
    );

    // 3. Create order (Pre-Estimation only, no post data yet)
    const order = await prisma.order.create({
      data: {
        customerId: customerRecord.id,
        branchId,
        staffId,
        orderType: 'BRANCH_DIRECT',
        status: 'PENDING_ESTIMATE_AGREEMENT', // ← NEW status
        weight: totalPreGross,
        purity: 'MIXED',
        estimatedTotal: 0,
        finalPrice: 0,
        depositedToBranch: false,
        items: {
          create: items.map((it) => ({
            name: it.name || 'Other',
            count: parseInt(it.count) || 1,
            purity: it.purity || '22K',
            imageUrls: it.imageUrls || [],

            // Pre-Estimation data
            preEstimationGrossWeight: parseFloat(it.preEstimationGrossWeight) || 0,

            // Estimated value (calculated on the frontend from current rate)
            ratePerGram: parseFloat(it.ratePerGram) || 0,
            itemPrice: parseFloat(it.itemPrice) || 0,

            // Post-Estimation — left blank until the next stage
            grossWeight: 0,
            stoneWeight: 0,
            dustWeight: 0,
            netWeight: 0,

            status: 'PENDING',
          })),
        },
      },
      include: {
        customer: true,
        staff: { select: { name: true, phone: true } },
        branch: { select: { name: true, code: true } },
        items: true,
      },
    });

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Create direct purchase error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}