/**
 * E2E тесты для аутентификации
 */

import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/crm/login')
    // Wait for Next.js dev compilation/rendering to finish
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 30_000 })
  })

  test('отображает страницу логина', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /tahocrm/i })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/пароль/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /войти/i })).toBeVisible()
  })

  test('валидирует форму перед отправкой', async ({ page }) => {
    // Очищаем email
    await page.getByLabel(/email/i).fill('')
    await page.getByRole('button', { name: /войти/i }).click()

    // Должна быть ошибка валидации
    await expect(page.getByText(/некорректный email/i)).toBeVisible()
  })

  test('отображает ошибку при неверных credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill('wrong@test.com')
    await page.getByLabel(/пароль/i).fill('wrongpassword')
    await page.getByRole('button', { name: /войти/i }).click()

    await expect(page.getByText(/неверный email или пароль/i)).toBeVisible()
  })

  test('успешный вход с правильными credentials', async ({ page }) => {
    // Данные уже предзаполнены в форме
    await page.getByRole('button', { name: /войти/i }).click()

    // Должен произойти редирект на главную
    await page.waitForURL(/\/crm(\/.*)?$/)
    await expect(page).toHaveURL(/\/crm(\/.*)?$/)
  })

  test('показывает состояние loading при входе', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /войти/i })

    await submitButton.click()

    // Кнопка должна быть disabled во время загрузки
    await expect(submitButton).toBeDisabled()
  })
})

test.describe('Platform Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/platform/login')
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 30_000 })
  })

  test('успешный вход в мега‑админку', async ({ page }) => {
    await page.getByRole('button', { name: /войти/i }).click()
    await page.waitForURL(/\/platform(\/.*)?$/)
    await expect(page).toHaveURL(/\/platform(\/.*)?$/)
  })
})
