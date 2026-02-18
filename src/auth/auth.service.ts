import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { UserService } from '../user/user.service';
import { normalizePhone } from '../utils/phone.utils';
import { LoginDto } from './dto/login.dto';

export interface AuthResponse {
  user: User;
  accessToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: CreateUserDto): Promise<AuthResponse> {
    const user = await this.userService.createUser(dto);
    const accessToken = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
    });
    this.logger.log(`User registered userId=${user.id} phone=${user.phone}`);
    return { user, accessToken };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const normalizedPhone = normalizePhone(dto.phone);
    const user = await this.userService.findUserByPhone(normalizedPhone);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const accessToken = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
    });
    this.logger.log(`Login success userId=${user.id} phone=${user.phone}`);
    return { user, accessToken };
  }
}
