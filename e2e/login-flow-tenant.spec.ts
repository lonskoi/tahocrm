/**
 * Login flow checks for /crm/tenant-1/login
 * Run: npx playwright test e2e/login-flow-tenant.spec.ts
 */

import { test, expect } from '@playwright/test'

test.describe('Login flow /crm/tenant-1', () => {
  test('1) tenant-admin@test.com / admin123 → redirect to /crm/tenant-1, authenticated', async ({
    page,
  }) => {
    // Same flow as auth.spec: /crm/login → /crm/tenant-1/login
    await page.goto('/crm/login')
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 15_000 })
    // Form pre-fills tenant-admin@test.com / admin123; use defaults
    await page.getByRole('button', { name: /войти/i }).click()

    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10_000 })
    expect(page.url()).toMatch(/\/crm\/tenant-1/)
  })

  test('2) manager@test.com / manager123 → redirect to /crm/tenant-1', async ({ page }) => {
    await page.goto('/crm/login')
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 15_000 })
    await page.getByLabel(/email/i).fill('manager@test.com')
    await page.getByLabel(/пароль/i).fill('manager123')
    await page.getByRole('button', { name: /войти/i }).click()

    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10_000 })
    expect(page.url()).toMatch(/\/crm\/tenant-1/)
  })

  test('3) Negative: manager@test.com / wrongpass123 → stay on login, error shown', async ({
    page,
  }) => {
    await page.goto('/crm/tenant-1/login')
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 15_000 })

    await page.getByLabel(/email/i).fill('manager@test.com')
    await page.getByLabel(/пароль/i).fill('wrongpass123')
    await page.getByRole('button', { name: /войти/i }).click()

    // Must stay on login
    await expect(page).toHaveURL(/\/crm\/tenant-1\/login/)
    await expect(page.getByText(/неверный email или пароль/i)).toBeVisible({ timeout: 5_000 })
  })
})
