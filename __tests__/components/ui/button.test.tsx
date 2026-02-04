/**
 * Unit тесты для компонента Button
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('рендерится с текстом', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('вызывает onClick при клике', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Click me</Button>)
    await user.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('отображает состояние loading', () => {
    render(<Button isLoading>Loading</Button>)
    const button = screen.getByRole('button')

    expect(button).toBeDisabled()
    expect(button).toHaveClass('relative', 'overflow-hidden')
  })

  it('disabled когда isLoading или disabled', () => {
    const { rerender } = render(<Button isLoading>Button</Button>)
    expect(screen.getByRole('button')).toBeDisabled()

    rerender(<Button disabled>Button</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('применяет правильные стили для разных вариантов', () => {
    const { rerender } = render(<Button variant="default">Default</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-gradient-to-r', 'from-blue-600')

    rerender(<Button variant="outline">Outline</Button>)
    expect(screen.getByRole('button')).toHaveClass('border-2', 'border-gray-300')

    rerender(<Button variant="destructive">Destructive</Button>)
    expect(screen.getByRole('button')).toHaveClass('from-red-600', 'to-red-700')

    rerender(<Button variant="gradient">Gradient</Button>)
    expect(screen.getByRole('button')).toHaveClass('from-purple-600', 'via-blue-600')
  })

  it('применяет правильные размеры', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-9', 'px-4', 'text-sm')

    rerender(<Button size="md">Medium</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-11', 'px-6', 'text-base')

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-14', 'px-8', 'text-lg')
  })

  it('передает все HTML атрибуты', () => {
    render(
      <Button type="submit" aria-label="Submit form">
        Submit
      </Button>
    )
    const button = screen.getByRole('button', { name: /submit form/i })

    expect(button).toHaveAttribute('type', 'submit')
  })
})
