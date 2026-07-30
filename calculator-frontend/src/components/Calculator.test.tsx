import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CalculatorApiError } from '../api/client'
import { Calculator } from './Calculator'

const { calculateBinary, calculateUnary } = vi.hoisted(() => ({
  calculateBinary: vi.fn(),
  calculateUnary: vi.fn(),
}))

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  calculateBinary,
  calculateUnary,
}))

beforeEach(() => {
  calculateBinary.mockReset()
  calculateUnary.mockReset()
})

/** The display is an <output>, so its text is the calculator's current value. */
function displayValue() {
  return screen.getByRole('status', { name: 'Result' }).textContent
}

describe('Calculator', () => {
  it('resolves an expression typed on the keypad', async () => {
    calculateBinary.mockResolvedValue(15)
    const user = userEvent.setup()
    render(<Calculator />)

    await user.click(screen.getByRole('button', { name: '1' }))
    await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.click(screen.getByRole('button', { name: '3' }))
    await user.click(screen.getByRole('button', { name: 'Equals' }))

    expect(calculateBinary).toHaveBeenCalledWith('add', 12, 3)
    await waitFor(() => expect(displayValue()).toBe('15'))
  })

  it.each([
    ['Add', 'add'],
    ['Subtract', 'subtract'],
    ['Multiply', 'multiply'],
    ['Divide', 'divide'],
    ['Power', 'power'],
    ['Percentage', 'percentage'],
  ])('sends the %s key to the API', async (label, operation) => {
    calculateBinary.mockResolvedValue(1)
    const user = userEvent.setup()
    render(<Calculator />)

    await user.click(screen.getByRole('button', { name: '5' }))
    await user.click(screen.getByRole('button', { name: label }))
    await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: 'Equals' }))

    expect(calculateBinary).toHaveBeenCalledWith(operation, 5, 2)
  })

  it('builds decimal entries', async () => {
    const user = userEvent.setup()
    render(<Calculator />)

    await user.click(screen.getByRole('button', { name: '1' }))
    await user.click(screen.getByRole('button', { name: 'Decimal point' }))
    await user.click(screen.getByRole('button', { name: '5' }))

    expect(displayValue()).toBe('1.5')
  })

  it('shows the pending expression above the value', async () => {
    const user = userEvent.setup()
    render(<Calculator />)

    await user.click(screen.getByRole('button', { name: '7' }))
    await user.click(screen.getByRole('button', { name: 'Multiply' }))

    expect(screen.getByText('7 ×')).toBeInTheDocument()
  })

  it('reports a division by zero without losing the entry', async () => {
    calculateBinary.mockRejectedValue(
      new CalculatorApiError('division_by_zero', 'division by zero is not allowed'),
    )
    const user = userEvent.setup()
    render(<Calculator />)

    await user.click(screen.getByRole('button', { name: '8' }))
    await user.click(screen.getByRole('button', { name: 'Divide' }))
    await user.click(screen.getByRole('button', { name: '0' }))
    await user.click(screen.getByRole('button', { name: 'Equals' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('division by zero is not allowed')
    expect(displayValue()).toBe('0')
  })

  it('applies the square root to the current entry', async () => {
    calculateUnary.mockResolvedValue(3)
    const user = userEvent.setup()
    render(<Calculator />)

    await user.click(screen.getByRole('button', { name: '9' }))
    await user.click(screen.getByRole('button', { name: 'Square root' }))

    expect(calculateUnary).toHaveBeenCalledWith('sqrt', 9)
    await waitFor(() => expect(displayValue()).toBe('3'))
  })

  it('clears the display', async () => {
    const user = userEvent.setup()
    render(<Calculator />)

    await user.click(screen.getByRole('button', { name: '5' }))
    await user.click(screen.getByRole('button', { name: 'Clear' }))

    expect(displayValue()).toBe('0')
  })

  it('accepts input from the physical keyboard', async () => {
    calculateBinary.mockResolvedValue(9)
    const user = userEvent.setup()
    render(<Calculator />)

    await user.keyboard('4*2')
    await user.keyboard('{Enter}')

    expect(calculateBinary).toHaveBeenCalledWith('multiply', 4, 2)
    await waitFor(() => expect(displayValue()).toBe('9'))
  })

  it.each([
    ['-', 'subtract'],
    ['/', 'divide'],
    ['^', 'power'],
    ['%', 'percentage'],
  ])('maps the "%s" key to %s', async (key, operation) => {
    calculateBinary.mockResolvedValue(1)
    const user = userEvent.setup()
    render(<Calculator />)

    await user.keyboard(`8${key}2=`)

    expect(calculateBinary).toHaveBeenCalledWith(operation, 8, 2)
  })

  it('types decimals with either separator', async () => {
    const user = userEvent.setup()
    render(<Calculator />)

    await user.keyboard('3,5')

    expect(displayValue()).toBe('3.5')
  })

  it('does not double-fire when Enter is pressed on a focused key', async () => {
    const user = userEvent.setup()
    render(<Calculator />)

    // Clicking leaves the key focused, so Enter activates it again — the window
    // listener must stay out of the way instead of also evaluating.
    await user.click(screen.getByRole('button', { name: '5' }))
    await user.keyboard('{Enter}')

    expect(calculateBinary).not.toHaveBeenCalled()
    expect(displayValue()).toBe('55')
  })

  it('clears with the Escape key', async () => {
    const user = userEvent.setup()
    render(<Calculator />)

    await user.keyboard('42')
    await user.keyboard('{Escape}')

    expect(displayValue()).toBe('0')
  })

  it('disables the keypad while a calculation is in flight', async () => {
    calculateBinary.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    render(<Calculator />)

    await user.click(screen.getByRole('button', { name: '6' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.click(screen.getByRole('button', { name: '1' }))
    await user.click(screen.getByRole('button', { name: 'Equals' }))

    await waitFor(() => expect(screen.getByRole('button', { name: '1' })).toBeDisabled())
    expect(screen.getByRole('progressbar', { name: 'Calculating' })).toBeInTheDocument()
  })
})
