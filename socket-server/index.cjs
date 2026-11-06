// socket-server.cjs
require('dotenv').config();

const { createServer } = require('http');
const { Server } = require('socket.io');

// Your existing helpers — reuse them as-is
const { verifyToken } = require('./auth.js');

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

const allowedOrigins = [
  'http://localhost:3000', 
  process.env.FRONTEND_URL  // e.g., https://your-app.vercel.app
].filter(Boolean); 

const io = new Server(httpServer, {
  path: '/socket.io',
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      
      // Check if the origin is in our allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`Blocked by CORS: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Required for cookies/JWT
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

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Socket.IO server running on port ${port}`);
});