import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login, approvePendingUser, register, csrfHeaders, setEsigApproved } from './helpers';

test.describe('Scenario 4: Electronic Signature Approval toggle ON', () => {
  test('toggling ON without a Company Signature falls back to the manual path', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin');
    // Ensure no signature is on file (regardless of what earlier test runs left behind), then switch the toggle ON.
    await page.request.delete('/api/settings/company-signature', { headers: await csrfHeaders(page) });
    await setEsigApproved(page, true);

    await page.goto('/new');
    await page.selectOption('.modern-type-field select', 'domestic');
    await page.click('button:has-text("+ Add flight row")');
    await page.click('button:has-text("Generate Form")');
    await page.click('button:has-text("Confirm & Generate")');
    await page.waitForURL(/\/preview\//);
    const id = decodeURIComponent(page.url().split('/preview/')[1]);

    await page.goto('/manager-approval');
    await page.click(`.manager-card:has-text("${id}") .manager-approve-btn`);
    await page.goto(`/preview/${id}`);
    // No Company Signature on file -> falls back to the manual path (stays Manager Approved, no auto-signature).
    await expect(page.locator('text=Manager Approved')).toBeVisible();
    await expect(page.locator('button:has-text("Print application")')).toBeVisible();
  });

  test('with a Company Signature uploaded: Manager approval auto-signs and sends straight to ECAA; ECAA can request changes; edit -> preview -> confirm returns it through Manager -> ECAA approves with an Approval No.', async ({ page, browser }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin');
    await page.locator('label:has-text("Upload signature image"), label:has-text("Replace signature")').locator('input[type="file"]').setInputFiles({
      name: 'company-sig.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-png-bytes'),
    });
    await setEsigApproved(page, true);

    const ecaaCtx = await browser.newContext();
    const ecaaPage = await ecaaCtx.newPage();
    const ecaaEmail = `ecaa-${Date.now()}@example.com`;
    await register(ecaaPage, 'ECAA Reviewer', ecaaEmail, 'Password123!');
    await approvePendingUser(page, ecaaEmail, 'ECAA');
    await login(ecaaPage, ecaaEmail, 'Password123!');

    await page.goto('/new');
    await page.selectOption('.modern-type-field select', 'domestic');
    await page.click('button:has-text("+ Add flight row")');
    await page.click('button:has-text("Generate Form")');
    await page.click('button:has-text("Confirm & Generate")');
    await page.waitForURL(/\/preview\//);
    const id = decodeURIComponent(page.url().split('/preview/')[1]);

    await page.goto('/manager-approval');
    await page.click(`.manager-card:has-text("${id}") .manager-approve-btn`);
    await page.goto(`/preview/${id}`);
    await expect(page.locator('text=Waiting ECAA Approval')).toBeVisible();
    await expect(page.locator('.esign-circle').first()).toBeVisible(); // auto-signed, no empty placeholder on the company signature circle

    await ecaaPage.goto(`/preview/${id}`);
    await ecaaPage.fill('textarea[placeholder="Enter ECAA comments or required changes..."]', 'Please fix the flight times.');
    await ecaaPage.click('button:has-text("Request Changes")');
    await expect(ecaaPage.locator('text=ECAA Changes Requested')).toBeVisible();

    await page.goto(`/new?edit=${id}`);
    await expect(page.locator('.modern-form-card')).not.toContainText('ECAA Comment'); // internal note not shown in the form itself
    await page.click('button:has-text("Save Changes")');
    await page.click('button:has-text("Confirm & Generate")');
    await page.waitForURL(`**/preview/${id}`);
    await expect(page.locator('text=Waiting Manager Approval')).toBeVisible();

    await page.goto('/manager-approval');
    await page.click(`.manager-card:has-text("${id}") .manager-approve-btn`);

    await ecaaPage.goto(`/preview/${id}`);
    await ecaaPage.fill('input[placeholder="Enter official ECAA approval number"]', 'ECAA-ONPATH-01');
    await ecaaPage.click('button:has-text("Approve Request")');
    await expect(ecaaPage.locator('.badge.approved')).toContainText('ECAA Approved');
    // ECAA's own view renders the Approval No. as an editable input (not plain text), so check its value.
    await expect(ecaaPage.locator('.approval-box input')).toHaveValue('ECAA-ONPATH-01');

    // A direct forbidden API call: a Specialist cannot approve on ECAA's behalf.
    const forbidden = await page.request.post(`/api/applications/${id}/ecaa/approve`, { headers: await csrfHeaders(page), data: { approvalNo: 'x' } });
    expect(forbidden.status()).toBe(403);

    await ecaaCtx.close();
  });
});
