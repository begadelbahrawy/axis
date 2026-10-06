import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

async function fillDomesticRow(page: import('@playwright/test').Page, outNo: string) {
  await page.selectOption('.modern-type-field select', 'domestic');
  await page.click('button:has-text("+ Add flight row")');
  const row = page.locator('table.flight-table tbody tr').first();
  await row.locator('input[placeholder="Out no."]').fill(outNo);
}

test.describe('Scenario 2 & 7: preview-before-confirm, back-to-edit, edit untouched until confirm', () => {
  test('preview shows nothing-saved banner; Back to edit keeps data; Confirm & Generate allocates the next Request No. and notifies the Manager', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/new');
    await fillDomesticRow(page, 'SM201');
    await page.click('button:has-text("Generate Form")');

    await expect(page.locator('.draft-preview-banner')).toContainText('Preview only');
    await expect(page.locator('.draft-preview-banner')).toContainText('not been submitted yet');
    await expect(page.locator('text=Preview — not submitted yet')).toBeVisible();

    // Back to edit must keep the data intact and must not have created anything.
    await page.click('button:has-text("Back to edit")');
    await expect(page.locator('table.flight-table tbody tr').first().locator('input[placeholder="Out no."]')).toHaveValue('SM201');

    // Abandon by navigating away entirely — confirm it consumed no Request No.
    await page.goto('/dashboard');
    await page.goto('/new');
    await fillDomesticRow(page, 'SM201');
    await page.click('button:has-text("Generate Form")');
    await page.click('button:has-text("Confirm & Generate")');

    await page.waitForURL(/\/preview\//);
    const id = decodeURIComponent(page.url().split('/preview/')[1]);
    expect(id).toMatch(/^DOM-\d{4}-001$/); // the earlier abandoned preview did not consume a number
    await expect(page.locator('text=Waiting Manager Approval')).toBeVisible();

    await page.goto('/manager-approval');
    await expect(page.locator(`.manager-card:has-text("${id}")`)).toBeVisible();
  });

  test('editing an existing application leaves the stored original untouched until Confirm', async ({ page, browser }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/new');
    await fillDomesticRow(page, 'SM301');
    await page.click('button:has-text("Generate Form")');
    await page.click('button:has-text("Confirm & Generate")');
    await page.waitForURL(/\/preview\//);
    const id = decodeURIComponent(page.url().split('/preview/')[1]);

    // Open the stored record in a second tab to compare against while editing.
    const otherCtx = await browser.newContext();
    const otherPage = await otherCtx.newPage();
    await login(otherPage, ADMIN_EMAIL, ADMIN_PASSWORD);
    await otherPage.goto(`/preview/${id}`);
    await expect(otherPage.locator('.letter-body-text').first()).not.toContainText('EDITED-MARKER');

    await page.goto(`/new?edit=${id}`);
    const commentsBox = page.locator('textarea[placeholder*="ملاحظات"]');
    await commentsBox.fill('EDITED-MARKER');
    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('.draft-preview-banner')).toBeVisible();

    // Still untouched on the server while the preview is open.
    await otherPage.reload();
    const stored = await otherPage.request.get(`/api/applications/${id}`);
    const storedBody = await stored.json();
    expect(storedBody.record.data.comments).not.toBe('EDITED-MARKER');

    // Going back to edit discards the draft; the original is still untouched.
    await page.click('button:has-text("Back to edit")');
    await page.goto(`/preview/${id}`);
    const afterAbandon = await page.request.get(`/api/applications/${id}`);
    expect((await afterAbandon.json()).record.data.comments).not.toBe('EDITED-MARKER');

    // Now actually confirm the edit and verify it takes effect.
    await page.goto(`/new?edit=${id}`);
    await commentsBox.fill('EDITED-MARKER');
    await page.click('button:has-text("Save Changes")');
    await page.click('button:has-text("Confirm & Generate")');
    await page.waitForURL(`**/preview/${id}`);
    const after = await page.request.get(`/api/applications/${id}`);
    expect((await after.json()).record.data.comments).toBe('EDITED-MARKER');

    await otherCtx.close();
  });
});
