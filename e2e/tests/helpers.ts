import { Page, expect } from '@playwright/test';

export const ADMIN_EMAIL = 'admin@aircairo.com';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'ChangeMe123!';

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('.login-submit-btn');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

let counter = 0;
export function uniqueEmail(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@example.com`.toLowerCase();
}

// Registers a new user on `page` (starting from /login), leaving it on the
// "registration submitted" message — does not approve or log in.
export async function register(page: Page, name: string, email: string, password = 'Password123!') {
  // Registration is an anonymous flow; drop any existing session on this page
  // first so /login doesn't redirect straight to /dashboard.
  await page.context().clearCookies();
  await page.goto('/login');
  await page.click('.login-switch-line >> text=Register');
  await page.fill('input[placeholder="e.g. Begad Fathy"]', name);
  await page.fill('input[placeholder="name@aircairo.com"]', email);
  await page.fill('input[placeholder="Choose a password"]', password);
  await page.fill('input[placeholder="Re-enter your password"]', password);
  await page.click('.login-submit-btn');
  await expect(page.locator('.login-success-box')).toContainText('Registration submitted', { timeout: 10000 });
}

// The Pending User Requests table is the first flight-table on /admin; Active
// Accounts is the second — scope to it so an approved email that now also
// appears in Active Accounts isn't mistaken for still being pending.
function pendingTable(adminPage: Page) {
  return adminPage.locator('table.flight-table').first();
}

// Approves a pending registration from an already-logged-in Admin page.
export async function approvePendingUser(adminPage: Page, email: string, role: 'SPECIALIST' | 'MANAGER' | 'ECAA' | 'ADMIN') {
  await adminPage.goto('/admin');
  const row = pendingTable(adminPage).locator('tr', { hasText: email });
  await row.waitFor({ timeout: 10000 });
  await row.locator('.role-select').selectOption(role);
  adminPage.once('dialog', (d) => d.accept());
  await row.locator('button:has-text("Approve User")').click();
  await expect(pendingTable(adminPage).locator('tr', { hasText: email })).not.toBeVisible({ timeout: 10000 });
}

export async function rejectPendingUser(adminPage: Page, email: string) {
  await adminPage.goto('/admin');
  const row = pendingTable(adminPage).locator('tr', { hasText: email });
  await row.waitFor({ timeout: 10000 });
  await row.locator('button:has-text("Reject")').click();
  await expect(pendingTable(adminPage).locator('tr', { hasText: email })).not.toBeVisible({ timeout: 10000 });
}

export async function setUserActive(adminPage: Page, email: string, active: boolean) {
  await adminPage.goto('/admin');
  const row = adminPage.locator('tr', { hasText: email });
  await row.waitFor({ timeout: 10000 });
  adminPage.once('dialog', (d) => d.accept());
  await row.locator(active ? 'button:has-text("Activate")' : 'button:has-text("Deactivate")').click();
}

// Sets the Electronic Signature Approval toggle on /admin to the desired
// state, waiting for the settings fetch to hydrate first — reading the
// checkbox before that finishes can see its default (unchecked) value even
// when the real persisted setting is ON, wrongly skipping the click.
export async function setEsigApproved(adminPage: Page, desired: boolean) {
  await adminPage.goto('/admin');
  const stateBadge = adminPage.locator('text=ON — automatic signature').or(adminPage.locator('text=OFF — manual print'));
  await expect(stateBadge).toBeVisible({ timeout: 10000 });
  const esigCheckbox = adminPage.locator('input[type="checkbox"]').first();
  if ((await esigCheckbox.isChecked()) !== desired) {
    await esigCheckbox.click();
    await expect(adminPage.locator(desired ? 'text=ON — automatic signature' : 'text=OFF — manual print')).toBeVisible({ timeout: 10000 });
  }
}

// Non-GET direct API calls made via page.request need the CSRF header the
// backend's double-submit check requires, same as the real frontend sends.
export async function csrfHeaders(page: Page): Promise<Record<string, string>> {
  const cookies = await page.context().cookies();
  const token = cookies.find((c) => c.name === 'axis_csrf')?.value || '';
  return { 'X-CSRF-Token': token };
}

// Full register -> admin approves -> logs the new user in on `page`.
export async function registerApproveLogin(page: Page, adminPage: Page, role: 'SPECIALIST' | 'MANAGER' | 'ECAA' | 'ADMIN', namePrefix = 'E2E User') {
  const email = uniqueEmail(namePrefix.replace(/\s+/g, '').toLowerCase());
  const password = 'Password123!';
  await register(page, namePrefix, email, password);
  await approvePendingUser(adminPage, email, role);
  await login(page, email, password);
  return { email, password };
}
