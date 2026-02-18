import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config();

/**
 * DataSource used by TypeORM CLI for migrations.
 * Do not use synchronize: true in production.
 */
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});

export default AppDataSource;
