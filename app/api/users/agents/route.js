import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const agents = await prisma.user.findMany({
      where: {
        role: 'AGENT',
      },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });

    return NextResponse.json({ success: true, agents });
  } catch (error) {
    console.error('Fetch agents error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}