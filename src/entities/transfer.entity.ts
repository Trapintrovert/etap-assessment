import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Wallet } from './wallet.entity';

export enum TransferStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
}

@Entity('transfers')
export class Transfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'from_wallet_id' })
  fromWalletId: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.transfersOut, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'from_wallet_id' })
  fromWallet: Wallet;

  @Column({ name: 'to_wallet_id' })
  toWalletId: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.transfersIn, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'to_wallet_id' })
  toWallet: Wallet;

  @Column({ type: 'decimal', precision: 20, scale: 2 })
  amount: string;

  @Column({
    type: 'enum',
    enum: TransferStatus,
    default: TransferStatus.PENDING_APPROVAL,
  })
  status: TransferStatus;

  @Column({ name: 'initiated_by_id' })
  initiatedById: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'initiated_by_id' })
  initiatedBy: User;

  @Column({ name: 'approved_by_id', nullable: true })
  approvedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy: User | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
