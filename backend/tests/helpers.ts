import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

export async function resetDb() {
  await prisma.$transaction([
    prisma.activityLog.deleteMany(),
    prisma.application.deleteMany(),
    prisma.requestSequence.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.loginAttempt.deleteMany(),
    prisma.pendingUserRequest.deleteMany(),
    prisma.settings.deleteMany(),
    prisma.specialFleetAircraft.deleteMany(),
    prisma.specialFleet.deleteMany(),
    prisma.fleetAircraft.deleteMany(),
    prisma.country.deleteMany(),
    prisma.domesticAirport.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export type Role = 'SPECIALIST' | 'MANAGER' | 'ECAA' | 'ADMIN';

// A supertest agent that keeps cookies (session + CSRF) across requests, with
// a helper to attach the CSRF header the backend's double-submit check
// requires on every non-GET /api request.
export class TestAgent {
  agent = request.agent(app);
  csrfToken = '';

  async primeCsrf() {
    const res = await this.agent.get('/api/health');
    const setCookie = res.headers['set-cookie'] as unknown as string[] | undefined;
    const csrfCookie = (setCookie || []).find((c) => c.startsWith('axis_csrf='));
    if (csrfCookie) this.csrfToken = decodeURIComponent(csrfCookie.split(';')[0].split('=')[1]);
  }

  post(path: string) {
    return this.agent.post(path).set('X-CSRF-Token', this.csrfToken);
  }
  put(path: string) {
    return this.agent.put(path).set('X-CSRF-Token', this.csrfToken);
  }
  patch(path: string) {
    return this.agent.patch(path).set('X-CSRF-Token', this.csrfToken);
  }
  delete(path: string) {
    return this.agent.delete(path).set('X-CSRF-Token', this.csrfToken);
  }
  get(path: string) {
    return this.agent.get(path);
  }
}

export async function newAgent(): Promise<TestAgent> {
  const a = new TestAgent();
  await a.primeCsrf();
  return a;
}

// Creates a user directly (bypassing register/approve) and logs them in,
// returning a ready-to-use authenticated agent plus the user's id.
export async function createLoggedInUser(role: Role, email: string, name = 'Test User', password = 'Password123!') {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { name, email, passwordHash, role, active: true } });
  const a = await newAgent();
  const res = await a.post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent: a, user };
}
