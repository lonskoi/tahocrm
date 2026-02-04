/**
 * Unit тесты для компонента Input
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/input'

describe('Input', () => {
  it('рендерится с label', () => {
    render(<Input label="Email" id="email" />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('отображает placeholder', () => {
    render(<Input placeholder="Enter email" id="email" />)
    expect(screen.getByPlaceholderText(/enter email/i)).toBeInTheDocument()
  })

  it('отображает ошибку валидации', () => {
    render(<Input error="This field is required" id="email" />)
    expect(screen.getByText(/this field is required/i)).toBeInTheDocument()

    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('border-red-300')
  })

  it('вызывает onChange при вводе', async () => {
    const handleChange = jest.fn()
    const user = userEvent.setup()

    render(<Input onChange={handleChange} id="email" />)
    const input = screen.getByRole('textbox')

    await user.type(input, 'test@example.com')
    expect(handleChange).toHaveBeenCalled()
  })

  it('отображает иконку', () => {
    render(<Input icon={<span data-testid="icon">🔍</span>} id="search" />)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('применяет правильные стили при focus', async () => {
    const user = userEvent.setup()
    render(<Input id="email" />)
    const input = screen.getByRole('textbox')

    await user.click(input)
    expect(input).toHaveClass('border-blue-500')
  })

  it('поддерживает разные типы input', () => {
    const { rerender } = render(<Input label="Email" type="email" id="email" />)
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email')

    rerender(<Input label="Пароль" type="password" id="password" />)
    expect(screen.getByLabelText(/пароль/i)).toHaveAttribute('type', 'password')
  })

  it('передает все HTML атрибуты', () => {
    render(<Input required aria-label="Email address" id="email" />)
    const input = screen.getByRole('textbox')

    expect(input).toBeRequired()
    expect(input).toHaveAttribute('aria-label', 'Email address')
  })
})
