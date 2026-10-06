import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login, register, approvePendingUser, rejectPendingUser, setUserActive, uniqueEmail } from './helpers';

test.describe('Scenario 1: registration, approval, role enforcement', () => {
  test('register -> Admin approves with a role -> user can log in; rejected user cannot', async ({ browser }) => {
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await login(adminPage, ADMIN_EMAIL, ADMIN_PASSWORD);

    const userCtx = await browser.newContext();
    const userPage = await userCtx.newPage();

    const approvedEmail = uniqueEmail('approved');
    await register(userPage, 'Approved Person', approvedEmail, 'Password123!');
    await approvePendingUser(adminPage, approvedEmail, 'SPECIALIST');
    await login(userPage, approvedEmail, 'Password123!');
    await expect(userPage).toHaveURL(/\/dashboard/);

    const rejectedEmail = uniqueEmail('rejected');
    await register(userPage, 'Rejected Person', rejectedEmail, 'Password123!');
    await rejectPendingUser(adminPage, rejectedEmail);
    await userPage.goto('/login');
    await userPage.fill('input[type="email"]', rejectedEmail);
    await userPage.fill('input[type="password"]', 'Password123!');
    await userPage.click('.login-submit-btn');
    await expect(userPage.locator('.login-error')).toBeVisible();

    await adminCtx.close();
    await userCtx.close();
  });

  test('a deactivated user cannot log in, and Admin cannot deactivate their own account', async ({ browser }) => {
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await login(adminPage, ADMIN_EMAIL, ADMIN_PASSWORD);

    const userCtx = await browser.newContext();
    const userPage = await userCtx.newPage();
    const email = uniqueEmail('deactivateme');
    await register(userPage, 'Deactivate Me', email, 'Password123!');
    await approvePendingUser(adminPage, email, 'SPECIALIST');
    await login(userPage, email, 'Password123!');
    await expect(userPage).toHaveURL(/\/dashboard/);

    await setUserActive(adminPage, email, false);

    await userPage.goto('/login');
    await userPage.fill('input[type="email"]', email);
    await userPage.fill('input[type="password"]', 'Password123!');
    await userPage.click('.login-submit-btn');
    await expect(userPage.locator('.login-error')).toBeVisible();

    // Admin's own row shows "Current Admin" instead of a Deactivate button — self-deactivation is not offered in the UI.
    await adminPage.goto('/admin');
    const ownRow = adminPage.locator('tr', { hasText: ADMIN_EMAIL });
    await expect(ownRow.locator('text=Current Admin')).toBeVisible();
    await expect(ownRow.locator('button:has-text("Deactivate")')).toHaveCount(0);

    await adminCtx.close();
    await userCtx.close();
  });
});
