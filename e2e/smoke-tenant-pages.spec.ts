/**
 * Smoke checks: customers, vehicles, driver-cards — no Prisma invocation error
 */

import { test, expect } from '@playwright/test'

const PAGES = [
  {
    path: '/crm/tenant-1/customers',
    heading: /клиенты/i,
    name: 'customers',
    emptyText: /клиентов пока нет|добавить клиента/i,
  },
  {
    path: '/crm/tenant-1/vehicles',
    heading: /транспорт/i,
    name: 'vehicles',
    emptyText: /тс пока нет|загрузка/i,
  },
  {
    path: '/crm/tenant-1/driver-cards',
    heading: /карты водителей/i,
    name: 'driver-cards',
    emptyText: /пока нет заявок|загрузка/i,
  },
] as const

test.describe('Smoke: tenant pages load without Prisma error', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/crm/tenant-1/login')
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: /войти/i }).click()
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10_000 })
  })

  for (const { path, heading, name, emptyText } of PAGES) {
    test(`${name}: ${path} loads without Prisma invocation error`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      expect(page.url()).toContain(path)
      await expect(page.getByRole('heading', { name: heading })).toBeVisible({ timeout: 10_000 })

      const errorBox = page.locator('.bg-red-50, [class*="border-red-200"]')
      const hasError = await errorBox.isVisible().catch(() => false)
      const errorContent = hasError ? ((await errorBox.textContent()) ?? '') : ''

      expect(
        errorContent,
        hasError ? `Page showed error: "${errorContent.slice(0, 300)}"` : undefined
      ).not.toMatch(/prisma|P[0-9]{4}|invocation|Invalid `prisma/i)

      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false)
      const hasEmpty = await page
        .getByText(emptyText)
        .isVisible()
        .catch(() => false)
      const state = hasTable ? 'list rendered' : hasEmpty ? 'empty/list area' : 'rendered'
      test.info().annotations.push({ type: 'state', description: `${name}: ${state}` })
    })
  }
})
