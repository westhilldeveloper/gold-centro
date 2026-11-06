// D:\gold-centro\app\api\branch\customers\lookup\route.js
import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    if (!phone || phone.length < 10) {
      return NextResponse.json({ success: true, customer: null });
    }

    const customer = await prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        name: true,
        phone: true,
        aadhaarNumber: true,
        aadhaarFront: true,
        aadhaarBack: true,
        panNumber: true,
        panFront: true,
        profilePhoto: true,
        role: true,
      },
    });

    // Only return if the user is actually a CUSTOMER
    if (customer && customer.role === 'CUSTOMER') {
      return NextResponse.json({ success: true, customer });
    }

    return NextResponse.json({ success: true, customer: null });
  } catch (error) {
    console.error('Customer lookup error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}