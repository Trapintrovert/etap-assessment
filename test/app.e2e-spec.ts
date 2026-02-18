import { ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ClassSerializerInterceptor } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import type { INestApplication } from '@nestjs/common';

dotenv.config();

/**
 * Builds the app with the same global prefix and pipes as production (main.ts)
 * so that GET /api and protected routes behave like in production.
 */
async function createProductionLikeApp(
  moduleFixture: TestingModule,
): Promise<INestApplication> {
  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  await app.init();
  return app;
}

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await createProductionLikeApp(moduleFixture);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('root', () => {
    it('GET /api returns 200 and hello message', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect(200)
        .expect('Hello World!');
    });
  });

  describe('critical path: register → login → create wallet', () => {
    const testPassword = 'TestPass123!';
    const uniquePhone =
      '+2348' + String(Math.floor(100000000 + Math.random() * 900000000));

    it('registers a user, logs in, and creates a wallet', async () => {
      const server = request(app.getHttpServer());
      const base = '/api';

      const registerRes = await server
        .post(`${base}/auth/register`)
        .send({ phone: uniquePhone, password: testPassword });

      if (registerRes.status === 201) {
        expect(registerRes.body.accessToken).toBeDefined();
        expect(registerRes.body.user).toBeDefined();
        expect(registerRes.body.user.passwordHash).toBeUndefined();
      } else if (registerRes.status === 409) {
        expect(registerRes.body.message).toBeDefined();
      } else {
        expect(registerRes.status).toBe(201);
      }

      const loginRes = await server
        .post(`${base}/auth/login`)
        .send({ phone: uniquePhone, password: testPassword });
      expect([200, 201]).toContain(loginRes.status);
      expect(loginRes.body.accessToken).toBeDefined();
      const token = loginRes.body.accessToken as string;

      const walletRes = await server
        .post(`${base}/wallets`)
        .set('Authorization', `Bearer ${token}`)
        .send({ currency: 'NGN' });
      expect(walletRes.status).toBe(201);
      expect(walletRes.body.currency).toBe('NGN');
      expect(walletRes.body.balance).toBeDefined();
      expect(walletRes.body.id).toBeDefined();
    });
  });
});
