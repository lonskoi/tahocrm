/**
 * E2E: Driver cards quick customer creation flow
 * Validates no Prisma FK error and UI remains functional
 */

import { test, expect } from '@playwright/test'

test('driver-cards quick create customer succeeds without Prisma FK error', async ({ page }) => {
  // 1) Login
  await page.goto('/crm/tenant-1/login')
  await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: /войти/i }).click()
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10_000 })

  // 2) Open driver-cards
  await page.goto('/crm/tenant-1/driver-cards')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: /карты водителей/i })).toBeVisible({
    timeout: 10_000,
  })

  // 3) Click "Добавить заявку"
  await page.getByRole('button', { name: /добавить заявку/i }).click()

  // 4) Quick create customer: type COMPANY (default), name "Тест Клиент"
  await expect(page.getByText(/новая заявка на карту водителя/i)).toBeVisible({ timeout: 5_000 })
  const addSection = page.locator('text=Добавить нового клиента').locator('../..')
  const nameInput = addSection.locator('input').first()
  await nameInput.fill('Тест Клиент')

  await page.getByRole('button', { name: /создать и выбрать/i }).click()

  // 5) Wait for create to complete - no error, customer selected
  await page.waitForTimeout(1500)

  const errorBox = page.locator('.bg-red-50, [class*="border-red-200"]')
  const hasError = await errorBox.isVisible().catch(() => false)
  const errorContent = hasError ? ((await errorBox.textContent()) ?? '') : ''

  expect(errorContent, hasError ? `Unexpected error: "${errorContent}"` : undefined).not.toMatch(
    /prisma|P[0-9]{4}|ForeignKey|foreign key|invocation|Invalid `prisma/i
  )

  // Customer selected: search field or list should show "Тест Клиент"
  const customerSelected =
    (await page
      .getByText('Тест Клиент')
      .first()
      .isVisible()
      .catch(() => false)) ||
    (await page
      .locator('input[value="Тест Клиент"]')
      .isVisible()
      .catch(() => false))
  expect(customerSelected, 'Customer "Тест Клиент" should be selected or visible').toBeTruthy()

  // 6) UI functional: modal still open, form fields usable
  await expect(page.getByText(/данные заявки/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /создать заявку/i })).toBeVisible()
})
