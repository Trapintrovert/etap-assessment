import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { validateEnv } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  validateEnv();

  const configService = app.get(ConfigService);

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  const corsOrigin = configService.get<string>('cors.origin', '*');
  app.enableCors({
    origin:
      corsOrigin === '*' ? true : corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-paystack-signature'],
  });

  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const config = new DocumentBuilder()
    .setTitle('Wallet System API')
    .setDescription(
      'REST API for a wallet system with user auth, multi-currency wallets, Paystack payments, wallet-to-wallet transfers, admin approval for large transfers, and monthly payment summaries.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'User registration and login')
    .addTag('wallets', 'Wallet management')
    .addTag('transfers', 'Wallet-to-wallet transfers')
    .addTag('transactions', 'Transaction management and monthly summaries')
    .addTag('payments', 'Paystack payment initialization and webhooks')
    .addTag('users', 'User management')
    .addTag(
      'admin',
      'Admin-only: pending transfers, approve/reject, monthly summaries',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 8000;
  await app.listen(port);
}
bootstrap();
