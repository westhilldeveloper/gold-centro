// D:\gold-centro\app\api\branch\customers\lookup\route.js
import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const rawPhone = searchParams.get('phone');

    if (!rawPhone || rawPhone.length < 10) {
      return NextResponse.json({ success: true, customer: null });
    }

    // Clean the input (just in case)
    const cleanPhone = rawPhone.replace(/\D/g, '');

    // Look for ANY variation of the phone number in the DB
    const customer = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },              // 8891332500
          { phone: `+91${cleanPhone}` },      // +918891332500
          { phone: `91${cleanPhone}` }        // 918891332500
        ],
        role: 'CUSTOMER'
      },
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

    if (customer) {
      return NextResponse.json({ success: true, customer });
    }

    // If not found, return null
    return NextResponse.json({ success: true, customer: null });
  } catch (error) {
    console.error('Customer lookup error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}