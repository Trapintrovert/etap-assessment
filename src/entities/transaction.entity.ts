import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';

export enum TransactionType {
  CREDIT = 'CREDIT',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
}

export enum TransactionStatus {
  COMPLETED = 'COMPLETED',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({ name: 'wallet_id' })
  walletId: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({ type: 'decimal', precision: 20, scale: 2 })
  amount: string;

  @Column({ nullable: true })
  reference: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.COMPLETED,
  })
  status: TransactionStatus;

  @Column({ name: 'transfer_id', nullable: true })
  transferId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
