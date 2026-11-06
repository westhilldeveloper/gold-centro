// server.js
require('dotenv').config({ path: ['.env.local', '.env'] });
const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k) continue;
    out[k] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function unauthorized(msg = 'UNAUTHORIZED') {
  return Object.assign(new Error(msg), { data: { code: 'UNAUTHORIZED' } });
}

app.prepare().then(async () => {
  const { verifyToken } = await import('./lib/server/auth.js');
  const httpServer = createServer((req, res) => handle(req, res));

  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: dev
      ? { origin: true, credentials: true }
      : {
          origin: process.env.APP_ORIGIN?.split(',').map((s) => s.trim()) ?? false,
          credentials: true,
        },
    pingInterval: 25000,
    pingTimeout: 20000,
    maxHttpBufferSize: 1e6,
  });

  // ---- Optional: Redis adapter (uncomment to scale horizontally) ----
  // if (process.env.REDIS_URL) {
  //   const { createAdapter } = require('@socket.io/redis-adapter');
  //   const { createClient } = require('redis');
  //   const pub = createClient({ url: process.env.REDIS_URL });
  //   const sub = pub.duplicate();
  //   await Promise.all([pub.connect(), sub.connect()]);
  //   io.adapter(createAdapter(pub, sub));
  //   console.log('[socket] Redis adapter enabled');
  // }

  // ---- Auth: runs on every (re)connection attempt ----
  io.use((socket, next) => {
    try {
      const authToken = socket.handshake.auth?.token;
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const cookieToken =
        cookies['token'] ||
        cookies['next-auth.session-token'] ||
        cookies['__Secure-next-auth.session-token'];

      const token = authToken || cookieToken;
      if (!token) return next(unauthorized('NO_TOKEN'));

      const user = verifyToken(token);
      socket.data.user = { id: user.id, role: user.role, email: user.email };
      next();
    } catch {
      next(unauthorized('INVALID_TOKEN'));
    }
  });

  // ---- Rooms are server-assigned. Client cannot spoof them. ----
  io.on('connection', (socket) => {
    const { id, role } = socket.data.user;

    socket.join(`user:${id}`);
    if (role === 'ADMIN') socket.join('admin');

    if (dev) console.log(`[socket] connect ${socket.id} user=${id} role=${role}`);

    socket.on('disconnect', (reason) => {
      if (dev) console.log(`[socket] disconnect ${socket.id} reason=${reason}`);
    });

    socket.on('error', (err) => {
      console.error(`[socket] error ${socket.id}`, err?.message || err);
    });
  });

  global.io = io;

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });

  const shutdown = (signal) => {
    console.log(`[server] ${signal} received`);
    io.close();
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
});