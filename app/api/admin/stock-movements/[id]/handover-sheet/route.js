import { prisma } from '../../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { url, uploadedBy, uploadedByName } = body || {};

    console.log('[HANDOVER SHEET] Received for movement', id, {
      url: url?.slice(0, 60),
      uploadedBy,
      uploadedByName,
    });

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'url is required' },
        { status: 400 }
      );
    }

    // Check the movement exists first — clearer error than a Prisma P2025
    const existing = await prisma.stockMovement.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Movement not found' },
        { status: 404 }
      );
    }

    const movement = await prisma.stockMovement.update({
      where: { id },
      data: {
        handoverSheetUrl: url,
        handoverSheetUploadedAt: new Date(),
        handoverSheetUploadedBy: uploadedBy || null,
        handoverSheetUploadedByName: uploadedByName || null,
      },
    });

    console.log('[HANDOVER SHEET] Saved for movement', id);
    return NextResponse.json({ success: true, movement });
  } catch (error) {
    console.error('[HANDOVER SHEET] Failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        code: error.code || null, // Prisma error codes like P2025, P2002
      },
      { status: 500 }
    );
  }
}