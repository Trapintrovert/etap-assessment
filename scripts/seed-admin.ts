/**
 * Seed script to create the first ADMIN user.
 * Run: npm run seed:admin
 *
 * Uses env vars ADMIN_PHONE and ADMIN_PASSWORD, or defaults for development.
 */

import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Transaction } from '../src/entities/transaction.entity';
import { Transfer } from '../src/entities/transfer.entity';
import { User, UserRole } from '../src/entities/user.entity';
import { Wallet } from '../src/entities/wallet.entity';
import { normalizePhone } from '../src/utils/phone.utils';

dotenv.config();

const SALT_ROUNDS = 10;
const DEFAULT_ADMIN_PHONE = '+2348000000000';
const DEFAULT_ADMIN_PASSWORD = 'Admin@123';

async function seedAdmin(): Promise<void> {
  const phone = process.env.ADMIN_PHONE || DEFAULT_ADMIN_PHONE;
  const password = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
  const normalizedPhone = normalizePhone(phone);

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [User, Wallet, Transaction, Transfer],
    synchronize: false,
  });

  await dataSource.initialize();

  try {
    const userRepo = dataSource.getRepository(User);
    const existing = await userRepo.findOne({
      where: { phone: normalizedPhone },
    });

    if (existing) {
      if (existing.role === UserRole.ADMIN) {
        console.log(`Admin user with phone ${normalizedPhone} already exists.`);
        return;
      }
      console.error(
        `User with phone ${normalizedPhone} exists but is not ADMIN. Aborting.`,
      );
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await userRepo.save({
      phone: normalizedPhone,
      passwordHash,
      role: UserRole.ADMIN,
    });

    console.log(`Admin user created successfully.`);
    console.log(`  Phone: ${normalizedPhone}`);
    console.log(`  Use ADMIN_PHONE and ADMIN_PASSWORD env vars to customize.`);
  } finally {
    await dataSource.destroy();
  }
}

seedAdmin().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
