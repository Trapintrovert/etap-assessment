import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Transaction } from './transaction.entity';
import { Transfer } from './transfer.entity';
import { User } from './user.entity';

@Entity('wallets')
@Unique(['userId', 'currency'])
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.wallets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 10 })
  currency: string;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  balance: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Transaction, (tx) => tx.wallet)
  transactions: Transaction[];

  @OneToMany(() => Transfer, (transfer) => transfer.fromWallet)
  transfersOut: Transfer[];

  @OneToMany(() => Transfer, (transfer) => transfer.toWallet)
  transfersIn: Transfer[];
}
