import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const {
      userId,
      // Aadhaar
      frontImage,
      backImage,
      aadhaarNumber,
      // PAN
      panFrontImage,
      panNumber,
    } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    const updateData = {};

    // Aadhaar
    if (frontImage)                  updateData.aadhaarFront   = frontImage;
    if (backImage)                   updateData.aadhaarBack    = backImage;
    if (aadhaarNumber !== undefined) updateData.aadhaarNumber  = aadhaarNumber;

    // PAN
    if (panFrontImage)               updateData.panFront       = panFrontImage;
    if (panNumber !== undefined)     updateData.panNumber      = panNumber;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Strip password before sending back
    const { password, ...safeUser } = updatedUser;

    return NextResponse.json({
      success: true,
      message: 'KYC data saved successfully',
      user: safeUser,
    });
  } catch (error) {
    console.error('KYC save error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}