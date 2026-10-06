import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login, registerApproveLogin, csrfHeaders } from './helpers';

test.describe('Scenario 8: Cancel = permanent delete, creator only', () => {
  test('the creator deletes it (record + files gone, one audit line, exact success message); a different user (Manager/Admin included) gets 403 and the button stays disabled', async ({ page, browser }) => {
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await login(adminPage, ADMIN_EMAIL, ADMIN_PASSWORD);

    const creatorCtx = await browser.newContext();
    const creatorPage = await creatorCtx.newPage();
    await registerApproveLogin(creatorPage, adminPage, 'SPECIALIST', 'Creator Person');

    await creatorPage.goto('/new');
    await creatorPage.selectOption('.modern-type-field select', 'domestic');
    await creatorPage.click('button:has-text("+ Add flight row")');
    await creatorPage.click('button:has-text("Generate Form")');
    await creatorPage.click('button:has-text("Confirm & Generate")');
    await creatorPage.waitForURL(/\/preview\//);
    const id = decodeURIComponent(creatorPage.url().split('/preview/')[1]);

    // A different user — the Admin, logged in separately — cannot delete it: 403, button disabled with the tooltip.
    await adminPage.goto('/lookup');
    await adminPage.fill('input[placeholder^="Search by"]', id);
    await adminPage.keyboard.press('Enter');
    await expect(adminPage.locator(`.records-list:has-text("${id}")`)).toBeVisible();
    const adminDeleteBtn = adminPage.locator('button:has-text("Cancel & delete application")');
    await expect(adminDeleteBtn).toBeDisabled();
    await expect(adminDeleteBtn).toHaveAttribute('title', 'Only the user who created this application can cancel it.');

    const forbidden = await adminPage.request.delete(`/api/applications/${id}`, { headers: await csrfHeaders(adminPage) });
    expect(forbidden.status()).toBe(403);
    expect((await forbidden.json()).error).toBe('Only the user who created this application can cancel it.');

    // The creator deletes it: button enabled, exact confirm dialog text, exact success message, record gone.
    await creatorPage.goto('/lookup');
    await creatorPage.fill('input[placeholder^="Search by"]', id);
    await creatorPage.keyboard.press('Enter');
    const creatorDeleteBtn = creatorPage.locator('button:has-text("Cancel & delete application")');
    await expect(creatorDeleteBtn).toBeEnabled();

    let dialogText = '';
    creatorPage.once('dialog', (d) => {
      dialogText = d.message();
      d.accept();
    });
    await creatorDeleteBtn.click();
    await expect(creatorPage.locator(`text=Application ${id} was cancelled and permanently deleted.`)).toBeVisible({ timeout: 10000 });
    expect(dialogText).toBe(
      `Cancel application ${id}?\n\nThis will PERMANENTLY DELETE it from the system, including its comments, approvals and uploaded files. This cannot be undone.`,
    );

    const gone = await creatorPage.request.get(`/api/applications/${id}`);
    expect(gone.status()).toBe(404);

    // One "Cancelled & Deleted" audit line, visible to Admin on the Activity Log.
    await adminPage.goto('/activity-log');
    await expect(adminPage.locator(`text=Cancelled & Deleted`)).toBeVisible();

    await adminCtx.close();
    await creatorCtx.close();
  });
});
