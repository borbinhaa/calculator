import { useReducer } from 'react'

import {
  CalculatorApiError,
  calculateBinary,
  calculateUnary,
  type BinaryOperation,
  type UnaryOperation,
} from '../api/client'
import {
  calculatorReducer,
  currentValue,
  initialState,
  type CalculatorAction,
  type CalculatorState,
} from '../state/calculatorReducer'

export type Calculator = CalculatorState & {
  inputDigit: (digit: string) => void
  inputDecimal: () => void
  clear: () => void
  selectOperation: (operation: BinaryOperation) => Promise<void>
  applyUnary: (operation: UnaryOperation) => Promise<void>
  evaluate: () => Promise<void>
}

export function useCalculator(): Calculator {
  const [state, dispatch] = useReducer(calculatorReducer, initialState)

  async function runCalculation(
    compute: () => Promise<number>,
    toSuccessAction: (result: number) => CalculatorAction,
  ): Promise<number | null> {
    dispatch({ type: 'calculation_started' })
    try {
      const result = await compute()
      dispatch(toSuccessAction(result))
      return result
    } catch (error) {
      dispatch({ type: 'calculation_failed', message: describeError(error) })
      return null
    }
  }

  /**
   * Resolves the pending operation, if any, so chained input like "2 + 3 + 4"
   * folds left to right the way a physical calculator does.
   */
  async function selectOperation(operation: BinaryOperation): Promise<void> {
    if (state.isCalculating) return

    let operand = currentValue(state)
    if (state.operation !== null && state.operand !== null && state.isEnteringNumber) {
      const pending = state.operation
      const left = state.operand
      const resolved = await runCalculation(
        () => calculateBinary(pending, left, operand),
        (result) => ({ type: 'evaluation_succeeded', result }),
      )
      if (resolved === null) return
      operand = resolved
    }

    dispatch({ type: 'operation_selected', operation, operand })
  }

  async function evaluate(): Promise<void> {
    if (state.isCalculating || state.operation === null || state.operand === null) return

    const operation = state.operation
    const left = state.operand
    await runCalculation(
      () => calculateBinary(operation, left, currentValue(state)),
      (result) => ({ type: 'evaluation_succeeded', result }),
    )
  }

  async function applyUnary(operation: UnaryOperation): Promise<void> {
    if (state.isCalculating) return

    await runCalculation(
      () => calculateUnary(operation, currentValue(state)),
      (result) => ({ type: 'value_replaced', result }),
    )
  }

  return {
    ...state,
    inputDigit: (digit) => dispatch({ type: 'digit_pressed', digit }),
    inputDecimal: () => dispatch({ type: 'decimal_pressed' }),
    clear: () => dispatch({ type: 'cleared' }),
    selectOperation,
    applyUnary,
    evaluate,
  }
}

function describeError(error: unknown): string {
  if (error instanceof CalculatorApiError) return error.message
  return 'Something went wrong while calculating.'
}
