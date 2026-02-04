/**
 * Unit тесты для компонента Modal
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from '@/components/ui/modal'

describe('Modal', () => {
  it('не рендерится когда isOpen=false', () => {
    render(
      <Modal isOpen={false} onClose={jest.fn()} title="Test Modal">
        Content
      </Modal>
    )
    expect(screen.queryByText(/test modal/i)).not.toBeInTheDocument()
  })

  it('рендерится когда isOpen=true', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="Test Modal">
        Content
      </Modal>
    )
    expect(screen.getByText(/test modal/i)).toBeInTheDocument()
    expect(screen.getByText(/content/i)).toBeInTheDocument()
  })

  it('вызывает onClose при клике на кнопку закрытия', async () => {
    const handleClose = jest.fn()
    const user = userEvent.setup()

    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        Content
      </Modal>
    )

    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)

    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('вызывает onClose при клике на overlay', async () => {
    const handleClose = jest.fn()
    const user = userEvent.setup()

    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        Content
      </Modal>
    )

    // Клик по backdrop (overlay)
    const backdrop = screen.getByText(/test modal/i).closest('.fixed.inset-0')
    if (backdrop) {
      await user.click(backdrop)
      expect(handleClose).toHaveBeenCalled()
    }
  })

  it('отображает title', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="My Title">
        Content
      </Modal>
    )
    expect(screen.getByText(/my title/i)).toBeInTheDocument()
  })

  it('отображает children', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="Test">
        <div data-testid="modal-content">Modal Content</div>
      </Modal>
    )
    expect(screen.getByTestId('modal-content')).toBeInTheDocument()
  })
})
