import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { Transaction } from './entities/transaction.entity';
import { Transfer } from './entities/transfer.entity';
import { User } from './entities/user.entity';
import { Wallet } from './entities/wallet.entity';
import { PaystackModule } from './paystack/paystack.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { WalletModule } from './wallet/wallet.module';
import { PaymentModule } from './payment/payment.module';
import { TransactionModule } from './transaction/transaction.module';
import { TransferModule } from './transfer/transfer.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('throttle.ttl', 60000),
            limit: config.get<number>('throttle.limit', 100),
          },
        ],
      }),
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [User, Wallet, Transaction, Transfer],
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
      logging: process.env.NODE_ENV === 'development',
    }),
    PaystackModule,
    UserModule,
    AuthModule,
    WalletModule,
    PaymentModule,
    TransactionModule,
    TransferModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
