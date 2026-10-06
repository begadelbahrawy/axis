import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

test.describe('Scenario 6: Travel Program multi-select A/C Type', () => {
  test('A320 only auto-fills read-only pax; adding E190 makes pax editable; including Other reveals a custom field; the document shows the joined label', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/new');
    await page.selectOption('.modern-type-field select', 'charter');
    await page.click('button:has-text("+ Add flight row")');
    const row = page.locator('table.flight-table tbody tr').first();
    await row.locator('input[placeholder="Dep no."]').fill('SM801');

    await page.check('text=Include Travel Program >> input[type="checkbox"]');

    const a320 = page.locator('label:has-text("A320") input[type="checkbox"]');
    const e190 = page.locator('label:has-text("E190") input[type="checkbox"]');
    const other = page.locator('label:has-text("Other") input[type="checkbox"]');
    await expect(a320).toBeChecked(); // A320 is the default selection

    const paxField = page.locator('.field:has(label:has-text("No. of Pax")) input');
    await expect(paxField).toBeDisabled();
    await expect(paxField).toHaveValue('174'); // AC_TYPE_PAX.A320

    await e190.check();
    await expect(paxField).toBeEnabled();

    await other.check();
    const customType = page.locator('.field:has(label:has-text("Custom aircraft type")) input');
    await expect(customType).toBeVisible();
    await customType.fill('B737');
    await paxField.fill('250');

    await page.click('button:has-text("Generate Form")');
    await expect(page.locator('.tp-mini .val').first()).toHaveText('A320 / E190 / B737');
  });
});
