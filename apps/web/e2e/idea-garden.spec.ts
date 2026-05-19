import { expect, test } from '@playwright/test';

test.describe('Idea Garden — Step 1 baseline', () => {
  test('empty state → plant first seed → card appears → reload preserves', async ({ page }) => {
    // ---------- 1. Empty state on a fresh DB (PRD §1.6 #2, US1 scenario 1) ----------
    await page.goto('/app');
    await expect(
      page.getByRole('heading', { name: /garden is empty/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /plant your first seed/i })).toBeVisible();

    // ---------- 2. Plant New Seed → modal opens (US1 scenario 2) ----------
    await page.getByRole('button', { name: /^plant new seed$/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /plant a new seed/i })).toBeVisible();

    // ---------- 3. Submit valid form → card prepends, modal closes (US1 scenario 3) ----------
    await dialog.getByLabel(/title/i).fill('Build an idea garden');
    await dialog.getByLabel(/description/i).fill('A playful CRUD app dressed up as a garden.');
    await dialog.getByRole('button', { name: /^plant$/i }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Build an idea garden' }),
    ).toBeVisible();
    await expect(page.getByText('Level 1')).toBeVisible();
    await expect(page.getByText(/just now/i).first()).toBeVisible();

    // ---------- 4. Reload preserves (US2 scenarios 1–3) ----------
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Build an idea garden' }),
    ).toBeVisible();
    await expect(page.getByText('Level 1')).toBeVisible();
    // The card now shows a non-"just now" relative time (or still "just now" if <60s).
    // Either way the card is present, which is the durability guarantee.
  });

  test('inline validation: empty title is rejected (US1 scenario 5)', async ({ page }) => {
    await page.goto('/app');
    await page.getByRole('button', { name: /^plant new seed$/i }).click();
    const dialog = page.getByRole('dialog');

    // Submit without filling the title
    await dialog.getByRole('button', { name: /^plant$/i }).click();

    await expect(dialog.getByText(/title is required/i)).toBeVisible();
    // Modal stays open
    await expect(dialog).toBeVisible();
  });

  test('inline validation: title over 80 characters is rejected', async ({ page }) => {
    await page.goto('/app');
    await page.getByRole('button', { name: /^plant new seed$/i }).click();
    const dialog = page.getByRole('dialog');

    await dialog.getByLabel(/title/i).fill('x'.repeat(81));
    await dialog.getByRole('button', { name: /^plant$/i }).click();
    await expect(dialog.getByText(/title must be 80 characters or fewer/i)).toBeVisible();
  });

  test('three-way modal close: X / Escape / backdrop (US1 scenario 7)', async ({ page }) => {
    await page.goto('/app');

    // X button
    await page.getByRole('button', { name: /^plant new seed$/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /close/i }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Escape key
    await page.getByRole('button', { name: /^plant new seed$/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Backdrop click
    await page.getByRole('button', { name: /^plant new seed$/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    // Click outside the dialog body (top-left corner of viewport, in the backdrop)
    await page.locator('[data-testid="modal-backdrop"]').click({
      position: { x: 5, y: 5 },
    });
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('special characters / emoji in title render as plain text (no HTML injection)', async ({ page }) => {
    await page.goto('/app');
    await page.getByRole('button', { name: /^plant new seed$/i }).click();
    const dialog = page.getByRole('dialog');

    const tricky = '🌱 idea <script>window.__pwned = true;</script>';
    await dialog.getByLabel(/title/i).fill(tricky);
    await dialog.getByRole('button', { name: /^plant$/i }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);

    // The literal characters are rendered in the heading…
    await expect(
      page.getByRole('heading', { name: tricky, exact: true }),
    ).toBeVisible();
    // …and the script never executed.
    const pwned = await page.evaluate(() => (window as { __pwned?: boolean }).__pwned ?? false);
    expect(pwned).toBe(false);
  });
});
