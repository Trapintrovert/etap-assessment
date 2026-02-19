/**
 * Credit 2,000,000 NGN to each user.
 * - If user has an NGN wallet: add 2000000 to balance and create a CREDIT transaction.
 * - If user has no NGN wallet: create one with balance 2000000 and create a CREDIT transaction.
 *
 * Run: npm run credit:all
 *
 * Requires .env with DB_*. Optional: CREDIT_AMOUNT (default 2000000), CREDIT_CURRENCY (default NGN).
 */

import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../src/entities/transaction.entity';
import { Transfer } from '../src/entities/transfer.entity';
import { User } from '../src/entities/user.entity';
import { Wallet } from '../src/entities/wallet.entity';

dotenv.config();

const DEFAULT_AMOUNT = 2_000_000;
const DEFAULT_CURRENCY = 'NGN';

async function creditAllUsers(): Promise<void> {
  const amount = Number(process.env.CREDIT_AMOUNT) || DEFAULT_AMOUNT;
  const currency = (
    process.env.CREDIT_CURRENCY || DEFAULT_CURRENCY
  ).toUpperCase();

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
    const walletRepo = dataSource.getRepository(Wallet);
    const transactionRepo = dataSource.getRepository(Transaction);

    const users = await userRepo.find();
    if (users.length === 0) {
      console.log('No users found.');
      return;
    }

    console.log(
      `Crediting ${amount} ${currency} to ${users.length} user(s)...`,
    );

    for (const user of users) {
      let wallet = await walletRepo.findOne({
        where: { userId: user.id, currency },
      });

      if (!wallet) {
        wallet = walletRepo.create({
          userId: user.id,
          currency,
          balance: '0',
        });
        wallet = await walletRepo.save(wallet);
        console.log(`  Created ${currency} wallet for user ${user.id}`);
      }

      const currentBalance = parseFloat(wallet.balance);
      const newBalance = currentBalance + amount;
      wallet.balance = newBalance.toFixed(2);
      await walletRepo.save(wallet);

      const reference = `CREDIT_${currency}_${Date.now()}_${user.id.slice(0, 8)}`;
      const transaction = transactionRepo.create({
        type: TransactionType.CREDIT,
        walletId: wallet.id,
        amount: String(amount),
        reference,
        status: TransactionStatus.COMPLETED,
        metadata: { source: 'credit-all-users', currency },
      });
      await transactionRepo.save(transaction);

      console.log(
        `  User ${user.id} (${user.phone}): wallet ${wallet.id} credited ${amount} ${currency}. New balance: ${wallet.balance}`,
      );
    }

    console.log(
      `Done. ${users.length} user(s) credited ${amount} ${currency} each.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

creditAllUsers().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
