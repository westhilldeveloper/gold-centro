import jwt from 'jsonwebtoken';

function secret() {
  const s = process.env.JWT_SECRET || process.env.AUTH_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
}

export function signTemp(payload, ttl = '10m') {
  return jwt.sign(payload, secret(), { expiresIn: ttl });
}

export function verifyTemp(token, expectedPurpose) {
  if (!token) throw new Error('Missing session');
  const decoded = jwt.verify(token, secret());
  if (decoded.purpose !== expectedPurpose) throw new Error('Invalid session');
  return decoded;
}

export function setTempCookie(res, name, value, maxAge = 600) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookies.set(name, value, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge,
  });
}

export function clearCookie(res, name) {
  res.cookies.set(name, '', { path: '/', maxAge: 0 });
}

export function publicUser(u) {
  return {
    id: u.id, phone: u.phone, name: u.name, role: u.role,
    aadhaarFront: u.aadhaarFront ?? null,
    aadhaarBack:  u.aadhaarBack  ?? null,
    aadhaarNumber: u.aadhaarNumber ?? null,
  };
}