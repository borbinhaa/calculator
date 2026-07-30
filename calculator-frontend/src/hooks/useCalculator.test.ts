import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CalculatorApiError } from '../api/client'
import { useCalculator } from './useCalculator'

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

/** Types each character into the calculator. */
function type(calculator: { inputDigit: (digit: string) => void }, value: string) {
  for (const digit of value) calculator.inputDigit(digit)
}

describe('useCalculator', () => {
  it('sends the operands to the API and shows the result', async () => {
    calculateBinary.mockResolvedValue(15)
    const { result } = renderHook(() => useCalculator())

    act(() => type(result.current, '12'))
    await act(() => result.current.selectOperation('add'))
    act(() => type(result.current, '3'))
    await act(() => result.current.evaluate())

    expect(calculateBinary).toHaveBeenCalledWith('add', 12, 3)
    expect(result.current.display).toBe('15')
    expect(result.current.expression).toBe('')
  })

  it('folds chained operations left to right', async () => {
    calculateBinary.mockResolvedValue(5)
    const { result } = renderHook(() => useCalculator())

    act(() => type(result.current, '2'))
    await act(() => result.current.selectOperation('add'))
    act(() => type(result.current, '3'))
    await act(() => result.current.selectOperation('multiply'))

    expect(calculateBinary).toHaveBeenCalledWith('add', 2, 3)
    expect(result.current.display).toBe('5')
    expect(result.current.expression).toBe('5 ×')
  })

  it('applies a unary operation to the current entry', async () => {
    calculateUnary.mockResolvedValue(3)
    const { result } = renderHook(() => useCalculator())

    act(() => type(result.current, '9'))
    await act(() => result.current.applyUnary('sqrt'))

    expect(calculateUnary).toHaveBeenCalledWith('sqrt', 9)
    expect(result.current.display).toBe('3')
  })

  it('surfaces the API message and keeps the pending operation on failure', async () => {
    calculateBinary.mockRejectedValue(
      new CalculatorApiError('division_by_zero', 'division by zero is not allowed'),
    )
    const { result } = renderHook(() => useCalculator())

    act(() => type(result.current, '12'))
    await act(() => result.current.selectOperation('divide'))
    act(() => type(result.current, '0'))
    await act(() => result.current.evaluate())

    expect(result.current.error).toBe('division by zero is not allowed')
    expect(result.current.operation).toBe('divide')
    expect(result.current.isCalculating).toBe(false)
  })

  it('reports a generic message for errors outside the API contract', async () => {
    calculateUnary.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useCalculator())

    await act(() => result.current.applyUnary('sqrt'))

    expect(result.current.error).toBe('Something went wrong while calculating.')
  })

  it('does not chain past a failed calculation', async () => {
    calculateBinary.mockRejectedValue(new CalculatorApiError('division_by_zero', 'nope'))
    const { result } = renderHook(() => useCalculator())

    act(() => type(result.current, '12'))
    await act(() => result.current.selectOperation('divide'))
    act(() => type(result.current, '0'))
    await act(() => result.current.selectOperation('add'))

    expect(result.current.operation).toBe('divide')
    expect(result.current.error).toBe('nope')
  })

  it('ignores further actions while a calculation is in flight', async () => {
    let resolvePending = (_: number) => {}
    calculateBinary.mockReturnValue(
      new Promise<number>((resolve) => {
        resolvePending = resolve
      }),
    )
    const { result } = renderHook(() => useCalculator())

    act(() => type(result.current, '12'))
    await act(() => result.current.selectOperation('add'))
    act(() => type(result.current, '3'))

    let firstEvaluation: Promise<void>
    act(() => {
      firstEvaluation = result.current.evaluate()
    })
    expect(result.current.isCalculating).toBe(true)

    // These must be dropped rather than queued behind the in-flight request.
    await act(() => result.current.evaluate())
    await act(() => result.current.selectOperation('multiply'))
    await act(() => result.current.applyUnary('sqrt'))

    expect(calculateBinary).toHaveBeenCalledTimes(1)
    expect(calculateUnary).not.toHaveBeenCalled()

    await act(async () => {
      resolvePending(15)
      await firstEvaluation
    })

    expect(result.current.display).toBe('15')
  })

  it('ignores equals when no operation is pending', async () => {
    const { result } = renderHook(() => useCalculator())

    act(() => type(result.current, '7'))
    await act(() => result.current.evaluate())

    expect(calculateBinary).not.toHaveBeenCalled()
    expect(result.current.display).toBe('7')
  })

  it('clears the calculator back to zero', async () => {
    const { result } = renderHook(() => useCalculator())

    act(() => type(result.current, '7'))
    act(() => result.current.inputDecimal())
    act(() => result.current.clear())

    expect(result.current.display).toBe('0')
  })
})
