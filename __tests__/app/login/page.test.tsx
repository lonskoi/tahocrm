/**
 * Unit тесты для страницы логина
 */

import { render, screen } from '@testing-library/react'
import LoginPage from '@/app/login/page'

describe('LoginPage', () => {
  it('рендерится как выбор входа (CRM vs Platform)', () => {
    render(<LoginPage />)

    expect(screen.getByRole('heading', { name: /tahocrm/i })).toBeInTheDocument()

    const crmLink = screen.getByRole('link', { name: /crm мастерской/i })
    const platformLink = screen.getByRole('link', { name: /мега/i })

    expect(crmLink).toHaveAttribute('href', '/crm/tenant-1/login')
    expect(platformLink).toHaveAttribute('href', '/platform/login')
  })
})
