import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';
import { emitToRoom } from '@/lib/socket-helper';

export const runtime = 'nodejs';

function getDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req) {
  try {
    const { orderId, agentId, agentLat, agentLng, qrSecret } = await req.json();

    if (!orderId || !agentId || !qrSecret) {
      throw new Error('Missing required fields: orderId, agentId, qrSecret');
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });
    if (!order) throw new Error('Order not found');
    if (order.agentId !== agentId) throw new Error('Agent not assigned to this order');
    if (order.qrSecret !== qrSecret) throw new Error('Invalid QR Code');

    if (agentLat != null && agentLng != null) {
      if (order.customerLat == null || order.customerLng == null) {
        throw new Error('Customer location not available – cannot verify distance.');
      }
      const distance = getDistance(order.customerLat, order.customerLng, agentLat, agentLng);
      if (distance === null) throw new Error('Invalid coordinates.');
      if (distance > 100) throw new Error(`Agent is too far (${distance.toFixed(0)}m away)`);
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'AGENT_ARRIVED',
        agentLat: agentLat ?? order.agentLat,
        agentLng: agentLng ?? order.agentLng,
      },
      // 🔥 ADD RELATIONS
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        agent:    { select: { id: true, name: true, phone: true } },
        items:    true,
      },
    });

    // 🔥 EMIT `updated`
    await emitToRoom('admin', 'offer-updated', updated);
     await emitToRoom(`user:${updated.customerId}`,'order-updated', updated)
    await emitToRoom(`user:${updated.agentId}`,'order-updated', updated)
   

    return NextResponse.json({
      success: true,
      message: 'Agent verified successfully.',
      order: updated,
    });
  } catch (err) {
    console.error('Verification error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}