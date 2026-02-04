import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/auth/LoginForm'
import { signIn } from 'next-auth/react'

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}))

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('рендерится и показывает поля', () => {
    render(
      <LoginForm
        title="CRM"
        subtitle="Test"
        defaultEmail="manager@test.com"
        defaultPassword="manager"
        successRedirectTo="/crm"
      />
    )

    expect(screen.getByRole('heading', { name: /crm/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/пароль/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /войти/i })).toBeInTheDocument()
  })

  it('не вызывает signIn если email невалиден', async () => {
    const user = userEvent.setup()
    render(
      <LoginForm
        title="CRM"
        defaultEmail="manager@test.com"
        defaultPassword="manager"
        successRedirectTo="/crm"
      />
    )

    const email = screen.getByLabelText(/email/i)
    await user.clear(email)
    await user.type(email, 'not-an-email')
    await user.click(screen.getByRole('button', { name: /войти/i }))

    expect(signIn).not.toHaveBeenCalled()
  })

  it('вызывает signIn при валидных данных', async () => {
    const user = userEvent.setup()
    ;(signIn as jest.Mock).mockResolvedValue({ ok: true })

    render(
      <LoginForm
        title="CRM"
        defaultEmail="manager@test.com"
        defaultPassword="manager"
        successRedirectTo="/crm"
      />
    )

    await user.click(screen.getByRole('button', { name: /войти/i }))

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('credentials', {
        email: 'manager@test.com',
        password: 'manager',
        redirect: false,
        callbackUrl: '/crm',
      })
    })
  })
})
