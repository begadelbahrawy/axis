import { config } from 'dotenv';

config();
if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is not set — refusing to run tests against the dev database.');
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
