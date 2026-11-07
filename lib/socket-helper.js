// lib/socket-helper.js
export async function emitToRoom(room, event, payload) {
  // 1. Local Development: Use the real socket server if available
  if (global.io) {
    global.io.to(room).emit(event, payload);
    return;
  }

  // 2. Production (Vercel): Send an HTTP request to Render
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  const secret = process.env.INTERNAL_SECRET;

  if (!socketUrl) {
    console.warn('Cannot emit: NEXT_PUBLIC_SOCKET_URL missing');
    return;
  }

  try {
    await fetch(`${socketUrl}/emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': secret,
      },
      body: JSON.stringify({ room, event, payload }),
    });
  } catch (err) {
    console.error('Failed to bridge socket emit:', err);
  }
}