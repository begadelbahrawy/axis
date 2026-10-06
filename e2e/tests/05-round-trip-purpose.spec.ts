import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

test.describe('Scenario 5: round-trip purposes (PAX/POS/FRY) combine correctly', () => {
  test('equal legs show once ("PAX"); differing legs show combined ("PAX / FRY") — in Domestic (simple style)', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/new');
    await page.selectOption('.modern-type-field select', 'domestic');
    await page.click('button:has-text("+ Add flight row")');
    const row = page.locator('table.flight-table tbody tr').first();
    await row.locator('input[placeholder="Out no."]').fill('SM401');
    // Both legs default to PAX — leave as-is for row 1's assertion; set second row's return leg to FRY.
    await page.click('button:has-text("+ Add flight row")');
    const row2 = page.locator('table.flight-table tbody tr').nth(1);
    await row2.locator('input[placeholder="Out no."]').fill('SM501');
    // Domestic rows use <select> for the From/To airport fields too, so the Remarks
    // column (9th <td>, 0-indexed 8) is targeted directly rather than by select index.
    await row2.locator('td').nth(8).locator('select').nth(1).selectOption('FRY'); // the Ret purpose select

    await page.click('button:has-text("Generate Form")');
    const body = page.locator('.preview-card.second-page, .preview-card:not(.second-page)').last();
    const cells = body.locator('table.flight-table tbody tr td').filter({ hasText: /PAX|FRY|POS/ });
    await expect(cells.nth(0)).toHaveText('PAX');
    await expect(cells.nth(1)).toHaveText('PAX / FRY');
  });

  test('wide style (Charter Dep/Arr) and a multi-country section row both combine differing legs the same way', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Charter (wide style, Dep/Arr labels).
    await page.goto('/new');
    await page.selectOption('.modern-type-field select', 'charter');
    await page.click('button:has-text("+ Add flight row")');
    const row = page.locator('table.flight-table tbody tr').first();
    await row.locator('input[placeholder="Dep no."]').fill('SM601');
    await row.locator('select').nth(0).selectOption('POS'); // Dep purpose
    await row.locator('select').nth(1).selectOption('PAX'); // Arr purpose
    await page.click('button:has-text("Generate Form")');
    const charterCell = page.locator('table.flight-table tbody tr td').filter({ hasText: /PAX|FRY|POS/ }).first();
    await expect(charterCell).toHaveText('POS / PAX');
    await page.click('button:has-text("Back to edit")');

    // Multi-country (Regular Season Schedule) — each row inside a Country Section has its own Out/Ret purpose pair.
    await page.selectOption('.modern-type-field select', 'season_schedule');
    await page.click('button:has-text("+ Add country")');
    await page.click('button:has-text("+ Add flight row")');
    const sectionRow = page.locator('.fleet-group table.flight-table tbody tr').first();
    await sectionRow.locator('input[placeholder="Out no."]').fill('SM701');
    await sectionRow.locator('select').nth(0).selectOption('PAX');
    await sectionRow.locator('select').nth(1).selectOption('FRY');
    await page.click('button:has-text("Generate Form")');
    const sectionCell = page.locator('table.flight-table tbody tr td').filter({ hasText: /PAX|FRY|POS/ }).first();
    await expect(sectionCell).toHaveText('PAX / FRY');
  });
});
