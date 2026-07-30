import { useEffect } from 'react'

import type { BinaryOperation } from '../api/client'
import { useCalculator } from '../hooks/useCalculator'
import { Display } from './Display'
import { ErrorBanner } from './ErrorBanner'
import { Keypad } from './Keypad'
import './Calculator.css'

const OPERATION_KEYS: Record<string, BinaryOperation> = {
  '+': 'add',
  '-': 'subtract',
  '*': 'multiply',
  '/': 'divide',
  '^': 'power',
  '%': 'percentage',
}

export function Calculator() {
  const calculator = useCalculator()

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const { key } = event

      // A focused key already handles Enter and Space; reacting here too would
      // fire the same action twice.
      if (event.target instanceof HTMLButtonElement && (key === 'Enter' || key === ' ')) return

      if (key >= '0' && key <= '9') {
        calculator.inputDigit(key)
        return
      }

      if (key === '.' || key === ',') {
        calculator.inputDecimal()
        return
      }

      const operation = OPERATION_KEYS[key]
      if (operation) {
        // Browsers use "/" for quick-find, which would steal the keystroke.
        event.preventDefault()
        void calculator.selectOperation(operation)
        return
      }

      if (key === 'Enter' || key === '=') {
        event.preventDefault()
        void calculator.evaluate()
        return
      }

      if (key === 'Escape') {
        calculator.clear()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [calculator])

  return (
    <section className="calculator" aria-label="Calculator">
      <Display
        expression={calculator.expression}
        value={calculator.display}
        isCalculating={calculator.isCalculating}
      />
      <ErrorBanner message={calculator.error} />
      <Keypad
        disabled={calculator.isCalculating}
        onDigit={calculator.inputDigit}
        onDecimal={calculator.inputDecimal}
        onClear={calculator.clear}
        onOperation={(operation) => void calculator.selectOperation(operation)}
        onUnary={(operation) => void calculator.applyUnary(operation)}
        onEvaluate={() => void calculator.evaluate()}
      />
    </section>
  )
}
