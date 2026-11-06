require('dotenv').config();

const { createServer } = require('http');
const { Server } = require('socket.io');
const { verifyToken } = require('./auth.js'); // Ensure this path is correct

const port = process.env.PORT || 3000;
const httpServer = createServer();

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
    // 1. Simplest CORS setup. Matches exactly what is in Render env vars.
    origin: process.env.FRONTEND_URL, 
    methods: ['GET', 'POST'],
    credentials: true, 
  },
  pingInterval: 25000,
  pingTimeout: 20000,
});

io.use((socket, next) => {
  try {
    // 2. Check handshake auth first (cross-origin safe), then fallback to cookie
    let token = socket.handshake.auth?.token;
    
    if (!token) {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      token = cookies['token'];
    }

    if (!token) return next(unauthorized('NO_TOKEN'));

    const user = verifyToken(token);
    socket.data.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    console.error('Socket Auth Error:', err.message);
    next(unauthorized('INVALID_TOKEN'));
  }
});

io.on('connection', (socket) => {
  const { id, role } = socket.data.user;
  socket.join(`user:${id}`);
  if (role === 'ADMIN') socket.join('admin');

  console.log(`[socket] connect ${socket.id} user=${id} role=${role}`);

  socket.on('disconnect', (reason) => {
    console.log(`[socket] disconnect ${socket.id} reason=${reason}`);
  });
});

// 3. 🔥 CRITICAL: Handle HTTP requests so Render's proxy allows WebSockets
httpServer.on('request', (req, res) => {
  // If Render pings the root URL, reply with a 200 OK
  if (req.url === '/' || req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Socket.IO server is running');
    return;
  }
  // Ignore other HTTP requests
  res.writeHead(404);
  res.end();
});

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Socket.IO server running on port ${port}`);
});