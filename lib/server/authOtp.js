import { prisma } from '../prisma';
import { sendOtpSms } from '../sendoxi';

const COOLDOWN_MS = 60_000;
const TTL_MS      = 5 * 60_000;

export function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

/**
 * Create a fresh OTP (invalidating older ones) and send it via Sendoxi.
 * If the SMS provider fails, the OTP row is deleted so the user can retry
 * immediately without hitting the 60s cooldown.
 */
export async function issueAndSendAuthOtp(user) {
  const recent = await prisma.oTP.findFirst({
    where: { userId: user.id, used: false, createdAt: { gt: new Date(Date.now() - COOLDOWN_MS) } },
    orderBy: { createdAt: 'desc' },
  });
  if (recent) throw httpError(429, 'Please wait a minute before requesting another OTP');

  await prisma.oTP.updateMany({ where: { userId: user.id, used: false }, data: { used: true } });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const otp  = await prisma.oTP.create({
    data: { userId: user.id, code, expiresAt: new Date(Date.now() + TTL_MS) },
  });

  try {
    await sendOtpSms({ to: user.phone, otp: code });
  } catch (err) {
    await prisma.oTP.delete({ where: { id: otp.id } }).catch(() => {});
    throw err;
  }
  return code;
}

export async function consumeAuthOtp(userId, code) {
  const otp = await prisma.oTP.findFirst({
    where: { userId, code: String(code), used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp) throw httpError(400, 'Invalid or expired OTP');

  const consumed = await prisma.oTP.updateMany({
    where: { id: otp.id, used: false },
    data: { used: true },
  });
  if (consumed.count !== 1) throw httpError(400, 'OTP already used');
}