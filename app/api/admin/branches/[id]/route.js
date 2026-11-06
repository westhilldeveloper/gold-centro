import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const { name, code, address, city, state, pincode, phone, isHeadOffice, isActive } = await req.json();

    if (isHeadOffice) {
      await prisma.branch.updateMany({
        where: { isHeadOffice: true, NOT: { id } },
        data: { isHeadOffice: false },
      });
    }

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(pincode !== undefined && { pincode }),
        ...(phone !== undefined && { phone }),
        ...(isHeadOffice !== undefined && { isHeadOffice }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ success: true, branch });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    // Check active dependencies
    const [agentCount, orderCount] = await Promise.all([
      prisma.user.count({ where: { branchId: id } }),
      prisma.order.count({ where: { branchId: id } }),
    ]);

    if (agentCount > 0 || orderCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete: ${agentCount} agent(s) and ${orderCount} order(s) are linked. Reassign them first.`,
        },
        { status: 400 }
      );
    }

    await prisma.branch.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}