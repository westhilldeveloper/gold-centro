// socket-server.cjs
require('dotenv').config();

const { createServer } = require('http');
const { Server } = require('socket.io');

// Your existing helpers — reuse them as-is
const { verifyToken } = require('./lib/server/auth.js');

const port = process.env.PORT || 3000;
const httpServer = createServer();

// Same parseCookies helper from your server.cjs
function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (k) out[k] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function unauthorized(msg = 'UNAUTHORIZED') {
  return Object.assign(new Error(msg), { data: { code: 'UNAUTHORIZED' } });
}

const io = new Server(httpServer, {
  path: '/socket.io',
  cors: {
    // IMPORTANT: allow your Next.js frontend's URL (Vercel, etc.)
    origin: process.env.FRONTEND_URL,   // e.g. https://your-app.vercel.app
    credentials: true,                   // REQUIRED so the browser sends the JWT cookie
  },
  pingInterval: 25000,
  pingTimeout: 20000,
});

// Same auth middleware as your server.cjs
io.use((socket, next) => {
  try {
    const cookies = parseCookies(socket.handshake.headers.cookie);
    const token = cookies['token'];
    if (!token) return next(unauthorized('NO_TOKEN'));

    const user = verifyToken(token);
    socket.data.user = { id: user.id, role: user.role };
    next();
  } catch {
    next(unauthorized('INVALID_TOKEN'));
  }
});

// Same room assignment as your server.cjs
io.on('connection', (socket) => {
  const { id, role } = socket.data.user;
  socket.join(`user:${id}`);
  if (role === 'ADMIN') socket.join('admin');

  console.log(`[socket] connect ${socket.id} user=${id} role=${role}`);

  socket.on('disconnect', (reason) => {
    console.log(`[socket] disconnect ${socket.id} reason=${reason}`);
  });
});

httpServer.listen(port, () => {
  console.log(`Socket.IO server running on port ${port}`);
});