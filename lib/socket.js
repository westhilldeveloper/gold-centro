// lib/socket.js
'use client';
import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (socket) return socket;

  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;

  socket = io(SOCKET_URL,{
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    withCredentials: true,      // send httpOnly auth cookie on handshake
    autoConnect: false,         // explicit connect after auth resolves (see SocketBoot)
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.5,
    timeout: 20000,
    // If you use Bearer tokens instead of cookies, add:
    // auth: (cb) => cb({ token: getMyToken() }),
    // Socket.IO calls `auth` on EVERY (re)connect — perfect for token rotation.
  });

  socket.on('connect_error', (err) => {
    const code = err?.data?.code;
    if (code === 'UNAUTHORIZED' || code === 'NO_TOKEN' || code === 'INVALID_TOKEN') {
      console.warn('[socket] handshake rejected — user may need to sign in again');
      // Optional: window.location.href = '/login';
    } else {
      console.warn('[socket] connect_error:', err.message);
    }
  });

  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected && !s.active) s.connect();
  return s;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}