import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login, csrfHeaders, setEsigApproved } from './helpers';

test.describe('Scenario 3: Electronic Signature Approval toggle OFF (default) — manual print & stamp path', () => {
  test('Manager approval does not auto-sign; creator must enter an Approval No. before the upload is accepted; then it finalizes to ECAA Approved', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Make sure the toggle is OFF for this test (it is the default, but be explicit — and earlier test files may have left it ON).
    await setEsigApproved(page, false);

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
    await expect(page.locator('text=Manager Approved')).toBeVisible();
    await expect(page.locator('.esign-circle-empty').first()).toBeVisible();
    await expect(page.locator('button:has-text("Print application")')).toBeVisible();

    // No Approval No. entered yet — the server rejects the upload (checked directly against the API for a deterministic assertion;
    // the UI itself blocks the same attempt client-side with an alert() before ever sending the request).
    const rejected = await page.request.post(`/api/applications/${id}/upload/manual-approval`, {
      headers: await csrfHeaders(page),
      multipart: { file: { name: 'x.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') } },
    });
    expect(rejected.status()).toBe(400);

    await page.fill('input[placeholder="ECAA Approval No."]', 'ECAA-E2E-001');
    await page.locator('input[type="file"][accept=".pdf,image/*"]').first().setInputFiles({ name: 'stamped.pdf', mimeType: 'application/pdf', buffer: Buffer.from('fake-pdf-bytes') });

    await expect(page.locator('text=ECAA Approved')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.approval-box')).toContainText('ECAA-E2E-001');
  });
});
