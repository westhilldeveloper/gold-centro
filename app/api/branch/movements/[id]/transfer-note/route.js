// app/api/branch/movements/[id]/transfer-note/route.js
import { prisma } from '../../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const { url, uploadedBy, uploadedByName } = await req.json();

    if (!url) {
      return NextResponse.json({ success: false, error: 'url required' }, { status: 400 });
    }

    const movement = await prisma.stockMovement.update({
      where: { id },
      data: {
        transferNoteUrl: url,
        transferNoteUploadedAt: new Date(),
        transferNoteUploadedBy: uploadedBy || null,
        transferNoteUploadedByName: uploadedByName || null,
      },
    });

    return NextResponse.json({ success: true, movement });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}