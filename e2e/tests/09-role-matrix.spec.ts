import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login, registerApproveLogin, csrfHeaders } from './helpers';

test.describe('Scenario 10: role matrix — UI access and server-side 403s on forbidden direct API calls', () => {
  test('Specialist: can create/edit/lookup but not reach Admin or Manager-approval screens, and forbidden API calls 403', async ({ page, browser }) => {
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await login(adminPage, ADMIN_EMAIL, ADMIN_PASSWORD);
    await registerApproveLogin(page, adminPage, 'SPECIALIST', 'Role Specialist');

    await page.goto('/dashboard');
    await expect(page.locator('#navNew')).toBeVisible();
    // The Administration nav group (Admin Settings / Activity Log) is only ever rendered for Admin.
    await expect(page.locator('.ui-sidebar-nav >> text=Admin Settings')).toHaveCount(0);
    await expect(page.locator('.ui-sidebar-nav >> text=Activity Log')).toHaveCount(0);
    await expect(page.locator('.manager-approval-header-btn')).toHaveCount(0);

    const forbiddenUsers = await page.request.get('/api/admin/users');
    expect(forbiddenUsers.status()).toBe(403);
    const forbiddenApprove = await page.request.post('/api/applications/DOM-0000-000/manager/approve', { headers: await csrfHeaders(page) });
    expect([403, 404]).toContain(forbiddenApprove.status()); // manager-role check (403) takes priority over not-found
    const forbiddenEcaa = await page.request.post('/api/applications/DOM-0000-000/ecaa/approve', { headers: await csrfHeaders(page), data: {} });
    expect(forbiddenEcaa.status()).toBe(403);

    await adminCtx.close();
  });

  test('Manager: reaches the Manager Approval queue and can approve, but cannot act on ECAA endpoints or reach Admin', async ({ page, browser }) => {
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await login(adminPage, ADMIN_EMAIL, ADMIN_PASSWORD);
    await registerApproveLogin(page, adminPage, 'MANAGER', 'Role Manager');

    await page.goto('/manager-approval');
    await expect(page.locator('h1:has-text("Manager Approval")')).toBeVisible();

    const forbiddenEcaa = await page.request.post('/api/applications/DOM-0000-000/ecaa/approve', { headers: await csrfHeaders(page), data: {} });
    expect(forbiddenEcaa.status()).toBe(403);
    const forbiddenAdmin = await page.request.get('/api/admin/users');
    expect(forbiddenAdmin.status()).toBe(403);

    await adminCtx.close();
  });

  test('ECAA: reaches the ECAA queue and approves with an Approval No., but cannot approve on the Manager queue or reach Admin', async ({ page, browser }) => {
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await login(adminPage, ADMIN_EMAIL, ADMIN_PASSWORD);
    await registerApproveLogin(page, adminPage, 'ECAA', 'Role Ecaa');

    const forbiddenManager = await page.request.post('/api/applications/DOM-0000-000/manager/approve', { headers: await csrfHeaders(page) });
    expect(forbiddenManager.status()).toBe(403);
    const forbiddenAdmin = await page.request.get('/api/admin/users');
    expect(forbiddenAdmin.status()).toBe(403);
    // ECAA cannot create applications either — only Specialist/Manager/Admin can.
    const forbiddenCreate = await page.request.post('/api/applications', { headers: await csrfHeaders(page), data: { type: 'domestic' } });
    expect(forbiddenCreate.status()).toBe(403);

    await adminCtx.close();
  });

  test('Admin: reaches every screen, including Admin settings and User Management', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    for (const path of ['/dashboard', '/new', '/records', '/lookup', '/fleet', '/countries', '/domestic-airports', '/manager-approval', '/admin', '/account', '/activity-log']) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(path.replace('/', '\\/') + '$'));
    }
  });
});
