import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { normalizePhone } from '../utils/phone.utils';

const SALT_ROUNDS = 10;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createUser(dto: CreateUserDto): Promise<User> {
    const normalizedPhone = normalizePhone(dto.phone);
    const existing = await this.userRepository.findOne({
      where: { phone: normalizedPhone },
    });
    if (existing) {
      throw new ConflictException(
        `User with phone ${normalizedPhone} already exists`,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = this.userRepository.create({
      phone: normalizedPhone,
      passwordHash,
      role: UserRole.USER,
    });

    return this.userRepository.save(user);
  }

  async findUserById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findUserByIdOrFail(id: string): Promise<User> {
    const user = await this.findUserById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  async findUserByPhone(phone: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { phone } });
  }

  async allUsers(): Promise<User[]> {
    return this.userRepository.find();
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findUserByIdOrFail(id);

    if (dto.phone !== undefined) {
      const normalizedPhone = normalizePhone(dto.phone);
      const existing = await this.userRepository.findOne({
        where: { phone: normalizedPhone },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `User with phone ${normalizedPhone} already exists`,
        );
      }
      user.phone = normalizedPhone;
    }

    return this.userRepository.save(user);
  }

  /**
   * Delete a user by id. The database enforces referential integrity with CASCADE:
   * - Wallets belonging to the user are deleted (wallets.user_id → users.id ON DELETE CASCADE).
   * - Transactions in those wallets are deleted (transactions.wallet_id → wallets.id ON DELETE CASCADE).
   * - Transfers from/to those wallets are deleted (transfers.from_wallet_id/to_wallet_id → wallets.id ON DELETE CASCADE).
   * - Transfers initiated by this user are deleted (transfers.initiated_by_id → users.id ON DELETE CASCADE).
   * - approved_by_id on any transfer is set to NULL if this user was the approver (ON DELETE SET NULL).
   * No orphaned rows remain.
   */
  async deleteUser(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }
}
