import 'dotenv/config';                      // loads .env → DATABASE_URL, ADMIN_*
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

const phone    = process.env.ADMIN_PHONE    || '9999999999';
const password = process.env.ADMIN_PASSWORD || 'ChangeMe123';

const hash = await bcrypt.hash(password, 12);
const user = await prisma.user.upsert({
  where:  { phone },
  update: { role: 'ADMIN', name: 'Admin', password: hash },
  create: { phone, name: 'Admin', role: 'ADMIN', password: hash },
});

console.log('Admin ready:', user.phone);

await prisma.$disconnect();
await pool.end();