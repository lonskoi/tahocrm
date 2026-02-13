/**
 * Driver-cards page: verify no tenant-access Prisma error shown to user
 */

import { test, expect } from '@playwright/test'

test('driver-cards loads without Prisma/tenant-access error', async ({ page }) => {
  // 1) Login
  await page.goto('/crm/tenant-1/login')
  await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: /войти/i }).click()
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10_000 })

  // 2) Navigate to driver-cards
  await page.goto('/crm/tenant-1/driver-cards')
  await page.waitForLoadState('networkidle')

  // 3) Confirm page loads
  await expect(page).toHaveURL(/\/crm\/tenant-1\/driver-cards/)
  await expect(page.getByRole('heading', { name: /карты водителей/i })).toBeVisible({
    timeout: 10_000,
  })

  // 4) Check for Prisma stacktrace - should NOT be shown
  const errorBox = page.locator('.bg-red-50, [class*="border-red-200"]')
  const hasError = await errorBox.isVisible().catch(() => false)
  const errorContent = hasError ? ((await errorBox.textContent()) ?? '') : ''

  expect(errorContent, hasError ? `Visible error: "${errorContent}"` : undefined).not.toMatch(
    /prisma|P[0-9]{4}|tenant.*access|invocation|Invalid `prisma/i
  )

  // 5) Visible state: list table, empty msg, or error
  const listTable = page.locator('table')
  const emptyMsg = page.getByText(/пока нет заявок/i)
  const loadingMsg = page.getByText(/загрузка/i)
  const hasTable = await listTable.isVisible().catch(() => false)
  const hasEmpty = await emptyMsg.isVisible().catch(() => false)
  const hasLoading = await loadingMsg.isVisible().catch(() => false)
  const rowCount = hasTable ? await page.locator('tbody tr').count() : 0

  const stateDesc = hasTable
    ? `List table with ${rowCount} row(s)`
    : hasEmpty
      ? 'Empty state ("Пока нет заявок")'
      : hasLoading
        ? 'Loading'
        : hasError
          ? `Error: ${errorContent.slice(0, 100)}`
          : 'Rendered'
  expect(hasTable || hasEmpty || hasLoading || hasError, `Visible state: ${stateDesc}`).toBeTruthy()
})
