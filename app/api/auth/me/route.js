// app/api/auth/me/route.js
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getAuthUser } from '../../../../lib/server/requireAuth';

export const runtime = 'nodejs';

export async function GET(req) {
  const auth = getAuthUser(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

 let user;
if (['BRANCH_MANAGER', 'BRANCH_STAFF'].includes(auth.role)) {
  user = await prisma.branchStaff.findUnique({
    where: { id: auth.id },
    select: { id: true, phone: true, name: true, role: true, branchId: true },
  });
} else {
  user = await prisma.user.findUnique({
    where: { id: auth.id },
    select: {
      id: true,
      phone: true,
      name: true,
      role: true,
      aadhaarFront: true,
      aadhaarBack: true,
      aadhaarNumber: true,
    },
  });
}
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'User not found' },
      { status: 401 }
    );
  }

  return NextResponse.json({ success: true, user });
}