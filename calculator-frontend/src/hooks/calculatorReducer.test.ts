import { describe, expect, it } from 'vitest'

import {
  calculatorReducer,
  currentValue,
  formatNumber,
  initialState,
  type CalculatorAction,
  type CalculatorState,
} from './calculatorReducer'

/** Applies a sequence of actions from a starting state. */
function reduce(actions: CalculatorAction[], from: CalculatorState = initialState) {
  return actions.reduce(calculatorReducer, from)
}

function digits(value: string): CalculatorAction[] {
  return [...value].map((digit) => ({ type: 'digit_pressed', digit }))
}

describe('number entry', () => {
  it('replaces the initial zero with the first digit', () => {
    expect(reduce(digits('5')).display).toBe('5')
  })

  it('appends subsequent digits', () => {
    expect(reduce(digits('123')).display).toBe('123')
  })

  it('starts a new entry after a result is shown', () => {
    const afterResult = calculatorReducer(initialState, { type: 'evaluation_succeeded', result: 42 })

    expect(reduce(digits('7'), afterResult).display).toBe('7')
  })

  it('adds a leading zero when the decimal point comes first', () => {
    expect(reduce([{ type: 'decimal_pressed' }]).display).toBe('0.')
  })

  it('ignores a second decimal point', () => {
    const state = reduce([...digits('1'), { type: 'decimal_pressed' }, ...digits('5')])

    expect(calculatorReducer(state, { type: 'decimal_pressed' }).display).toBe('1.5')
  })

  it('stops accepting digits past the precision limit', () => {
    expect(reduce(digits('12345678901234567890')).display).toBe('123456789012345')
  })

  it('clears everything back to the initial state', () => {
    const state = reduce([...digits('99'), { type: 'operation_selected', operation: 'add', operand: 99 }])

    expect(calculatorReducer(state, { type: 'cleared' })).toEqual(initialState)
  })
})

describe('pending operations', () => {
  it('records the operand and shows the expression', () => {
    const state = reduce([
      ...digits('12'),
      { type: 'operation_selected', operation: 'add', operand: 12 },
    ])

    expect(state).toMatchObject({ display: '12', expression: '12 +', operand: 12, operation: 'add' })
  })

  it('clears the pending operation once evaluated', () => {
    const state = reduce([
      ...digits('12'),
      { type: 'operation_selected', operation: 'add', operand: 12 },
      ...digits('3'),
      { type: 'evaluation_succeeded', result: 15 },
    ])

    expect(state).toMatchObject({
      display: '15',
      expression: '',
      operand: null,
      operation: null,
      isEnteringNumber: false,
    })
  })

  it('keeps the pending operation when a unary result replaces the display', () => {
    const state = reduce([
      ...digits('9'),
      { type: 'operation_selected', operation: 'add', operand: 9 },
      ...digits('16'),
      { type: 'value_replaced', result: 4 },
    ])

    expect(state).toMatchObject({ display: '4', operand: 9, operation: 'add' })
  })
})

describe('calculation status', () => {
  it('flags an in-flight calculation', () => {
    const state = calculatorReducer(initialState, { type: 'calculation_started' })

    expect(state.isCalculating).toBe(true)
  })

  it('keeps the entry and the pending operation after a failure', () => {
    const pending = reduce([
      ...digits('12'),
      { type: 'operation_selected', operation: 'divide', operand: 12 },
      ...digits('0'),
    ])

    const failed = calculatorReducer(pending, {
      type: 'calculation_failed',
      message: 'division by zero is not allowed',
    })

    expect(failed).toMatchObject({
      display: '0',
      operand: 12,
      operation: 'divide',
      isCalculating: false,
      error: 'division by zero is not allowed',
    })
  })

  it('drops the error as soon as the user types again', () => {
    const failed = calculatorReducer(initialState, { type: 'calculation_failed', message: 'boom' })

    expect(calculatorReducer(failed, { type: 'digit_pressed', digit: '1' }).error).toBeNull()
  })
})

describe('formatNumber', () => {
  it.each([
    [15, '15'],
    [-4, '-4'],
    [3.5, '3.5'],
    [0.30000000000000004, '0.3'],
    [1 / 3, '0.333333333333'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected)
  })
})

describe('currentValue', () => {
  it('reads the display as a number', () => {
    expect(currentValue(reduce(digits('42')))).toBe(42)
  })
})
