import type { BinaryOperation } from '../api/client'

/**
 * Pure state machine behind the calculator.
 *
 * Arithmetic itself lives on the server, so this reducer only tracks what the
 * user has typed and which operation is pending. Results arrive as actions
 * dispatched by useCalculator once the API responds.
 */

export const OPERATION_SYMBOLS: Record<BinaryOperation, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
  power: '^',
  percentage: '% of',
}

/** Guards against entries longer than float64 can represent exactly. */
const MAX_DIGITS = 15

export type CalculatorState = {
  display: string
  expression: string
  operand: number | null
  operation: BinaryOperation | null
  isEnteringNumber: boolean
  isCalculating: boolean
  error: string | null
}

export type CalculatorAction =
  | { type: 'digit_pressed'; digit: string }
  | { type: 'decimal_pressed' }
  | { type: 'cleared' }
  | { type: 'operation_selected'; operation: BinaryOperation; operand: number }
  | { type: 'calculation_started' }
  | { type: 'evaluation_succeeded'; result: number }
  | { type: 'value_replaced'; result: number }
  | { type: 'calculation_failed'; message: string }

export const initialState: CalculatorState = {
  display: '0',
  expression: '',
  operand: null,
  operation: null,
  isEnteringNumber: false,
  isCalculating: false,
  error: null,
}

export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction,
): CalculatorState {
  switch (action.type) {
    case 'digit_pressed':
      return {
        ...state,
        display: state.isEnteringNumber ? appendDigit(state.display, action.digit) : action.digit,
        isEnteringNumber: true,
        error: null,
      }

    case 'decimal_pressed': {
      if (!state.isEnteringNumber) {
        return { ...state, display: '0.', isEnteringNumber: true, error: null }
      }
      if (state.display.includes('.')) return state
      return { ...state, display: `${state.display}.`, error: null }
    }

    case 'cleared':
      return initialState

    case 'operation_selected':
      return {
        ...state,
        display: formatNumber(action.operand),
        expression: `${formatNumber(action.operand)} ${OPERATION_SYMBOLS[action.operation]}`,
        operand: action.operand,
        operation: action.operation,
        isEnteringNumber: false,
        isCalculating: false,
        error: null,
      }

    case 'calculation_started':
      return { ...state, isCalculating: true, error: null }

    case 'evaluation_succeeded':
      return {
        ...initialState,
        display: formatNumber(action.result),
      }

    // Unary results replace the display but leave any pending operation alone,
    // so "9 + 16 √ =" still resolves as 9 + 4.
    case 'value_replaced':
      return {
        ...state,
        display: formatNumber(action.result),
        isEnteringNumber: false,
        isCalculating: false,
        error: null,
      }

    // The pending operation survives a failure so the user can fix the operand
    // and try again instead of retyping the whole expression.
    case 'calculation_failed':
      return { ...state, isCalculating: false, error: action.message }
  }
}

export function currentValue(state: CalculatorState): number {
  return Number(state.display)
}

/**
 * Trims the noise floating point leaves behind (0.1 + 0.2 would otherwise read
 * as 0.30000000000000004) without rounding away meaningful precision.
 */
export function formatNumber(value: number): string {
  if (Number.isInteger(value) && Math.abs(value) < 1e15) return String(value)
  return String(Number(value.toPrecision(12)))
}

function appendDigit(display: string, digit: string): string {
  if (display === '0') return digit
  if (countDigits(display) >= MAX_DIGITS) return display
  return display + digit
}

function countDigits(display: string): number {
  return display.replace(/\D/g, '').length
}
