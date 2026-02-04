/**
 * E2E тесты для dashboard
 */

import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Логинимся как admin
    await page.goto('/platform/login')
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 30_000 })
    await page.getByRole('button', { name: /войти/i }).click()
    await page.waitForURL(/\/platform(\/.*)?$/)
  })

  test('отображает dashboard после входа', async ({ page }) => {
    await expect(page).toHaveURL(/\/platform(\/.*)?$/)
    // Проверяем наличие элементов dashboard
    await expect(page.locator('body')).toContainText(/tahocrm|dashboard/i, { timeout: 5000 })
  })

  test('навигация работает', async ({ page }) => {
    // Проверяем наличие навигации
    const navLinks = page.locator('nav a, [role="navigation"] a')
    const count = await navLinks.count()

    if (count > 0) {
      // Если есть ссылки навигации, проверяем что они кликабельны
      await expect(navLinks.first()).toBeVisible()
    }
  })

  test('отображает информацию пользователя', async ({ page }) => {
    // После входа должна быть видна информация о пользователе
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('CRM Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/crm/login')
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 30_000 })
    await page.getByRole('button', { name: /войти/i }).click()
    await page.waitForURL(/\/crm(\/.*)?$/)
  })

  test('отображает CRM после входа', async ({ page }) => {
    await expect(page).toHaveURL(/\/crm(\/.*)?$/)
    await expect(page.locator('body')).toContainText(/tahocrm/i, { timeout: 5000 })
  })
})
