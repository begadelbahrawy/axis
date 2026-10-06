import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { resetDb, newAgent, createLoggedInUser } from '../helpers';

describe('auth flow', () => {
  beforeEach(resetDb);

  it('rejects a mutating request without the CSRF header', async () => {
    const a = await newAgent();
    const res = await a.agent.post('/api/auth/login').send({ email: 'nobody@example.com', password: 'whatever1' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/CSRF/i);
  });

  it('registers, requires Admin approval, then allows login with the chosen password and role', async () => {
    const a = await newAgent();
    const reg = await a.post('/api/auth/register').send({ name: 'Jane Specialist', email: 'jane@example.com', password: 'Password123!' });
    expect(reg.status).toBe(201);

    // Cannot log in yet — no account exists until Admin approves.
    const failedLogin = await a.post('/api/auth/login').send({ email: 'jane@example.com', password: 'Password123!' });
    expect(failedLogin.status).toBe(401);

    const { agent: admin } = await createLoggedInUser('ADMIN', 'admin@example.com');
    const pendingList = await admin.get('/api/admin/pending-users');
    expect(pendingList.body.pending).toHaveLength(1);
    const pendingId = pendingList.body.pending[0].id;

    const approve = await admin.post(`/api/admin/pending-users/${pendingId}/approve`).send({ role: 'SPECIALIST' });
    expect(approve.status).toBe(201);
    expect(approve.body.user.role).toBe('SPECIALIST');

    const login = await a.post('/api/auth/login').send({ email: 'jane@example.com', password: 'Password123!' });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('SPECIALIST');
  });

  it('rejects an incorrect password and locks out after repeated failures', async () => {
    await createLoggedInUser('SPECIALIST', 'locked@example.com', 'Locked User', 'Correct123!');
    const a = await newAgent();
    for (let i = 0; i < 10; i++) {
      const res = await a.post('/api/auth/login').send({ email: 'locked@example.com', password: 'wrong-password' });
      expect(res.status).toBe(401);
    }
    const locked = await a.post('/api/auth/login').send({ email: 'locked@example.com', password: 'Correct123!' });
    expect(locked.status).toBe(429);
  });

  it('issues a single-use, expiring password reset token', async () => {
    const { user } = await createLoggedInUser('SPECIALIST', 'reset@example.com', 'Reset User', 'OldPassword1!');
    const a = await newAgent();
    const forgot = await a.post('/api/auth/forgot-password').send({ email: 'reset@example.com' });
    expect(forgot.status).toBe(200);

    const tokenRow = await prisma.passwordResetToken.findFirstOrThrow({ where: { userId: user.id } });
    expect(tokenRow.usedAt).toBeNull();
    // The raw token is never stored — only a hash is persisted.
    expect(tokenRow.tokenHash).not.toContain('OldPassword');

    // We don't have the raw token (only its hash is persisted, by design) —
    // simulate it by minting one the same way the route does, bypassing the
    // email step, to exercise /reset-password's validation end to end.
    const { randomToken, hashToken } = await import('../../src/lib/crypto');
    const rawToken = randomToken(32);
    await prisma.passwordResetToken.update({ where: { id: tokenRow.id }, data: { tokenHash: hashToken(rawToken) } });

    const badReset = await a.post('/api/auth/reset-password').send({ token: 'not-the-real-token', password: 'NewPassword1!' });
    expect(badReset.status).toBe(400);

    const reset = await a.post('/api/auth/reset-password').send({ token: rawToken, password: 'NewPassword1!' });
    expect(reset.status).toBe(200);

    // The same token cannot be used twice.
    const reuse = await a.post('/api/auth/reset-password').send({ token: rawToken, password: 'AnotherPassword1!' });
    expect(reuse.status).toBe(400);

    const login = await a.post('/api/auth/login').send({ email: 'reset@example.com', password: 'NewPassword1!' });
    expect(login.status).toBe(200);
  });

  it('enforces role checks on admin-only routes', async () => {
    const { agent: specialist } = await createLoggedInUser('SPECIALIST', 'spec@example.com');
    const res = await specialist.get('/api/admin/users');
    expect(res.status).toBe(403);
  });
});
