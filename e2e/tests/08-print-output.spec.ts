import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login, setEsigApproved } from './helpers';

test.describe('Scenario 9: print/download output purity and Arabic RTL rendering', () => {
  test('an ECAA Approved application shows only the official letter — no internal banners, comment boxes, buttons or supporting-doc list — inside the printable area, and renders Arabic right-to-left', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Ensure esig is OFF so the manual path (no ECAA login needed) finalizes it quickly.
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
    await page.fill('input[placeholder="ECAA Approval No."]', 'ECAA-PRINT-01');
    await page.locator('input[type="file"][accept=".pdf,image/*"]').first().setInputFiles({ name: 'stamped.pdf', mimeType: 'application/pdf', buffer: Buffer.from('fake-pdf-bytes') });
    await expect(page.locator('.badge.approved')).toContainText('ECAA Approved', { timeout: 10000 });

    // The printable document cards contain the letter content...
    const printable = page.locator('.preview-card').first();
    await expect(printable).toContainText('السيدة / رئيس الإدارة المركزية للنقل الجوى');
    await expect(printable.locator('.letter-salutation').first()).toHaveCSS('direction', 'rtl');

    // ...and never the internal workflow chrome, which lives in separate siblings outside any .preview-card.
    await expect(page.locator('.preview-card .internal-workflow-note')).toHaveCount(0);
    await expect(page.locator('.preview-card .manager-gate, .preview-card .manager-approved-note')).toHaveCount(0);
    await expect(page.locator('.preview-card .actions-row')).toHaveCount(0);
    await expect(page.locator('.preview-card .supporting-docs-list')).toHaveCount(0);
    await expect(page.locator('.preview-card button')).toHaveCount(0);
  });
});
