import type { BinaryOperation, UnaryOperation } from '../api/client'
import { Key, type KeyVariant } from './Key'
import './Keypad.css'

export type KeypadHandlers = {
  onDigit: (digit: string) => void
  onDecimal: () => void
  onClear: () => void
  onOperation: (operation: BinaryOperation) => void
  onUnary: (operation: UnaryOperation) => void
  onEvaluate: () => void
}

export type KeypadProps = KeypadHandlers & {
  disabled?: boolean
}

type KeySpec = {
  label: string
  description?: string
  variant: KeyVariant
  press: (handlers: KeypadHandlers) => void
}

function digitKey(digit: string): KeySpec {
  return { label: digit, variant: 'digit', press: (h) => h.onDigit(digit) }
}

/**
 * The layout is data rather than markup so the grid stays declarative and each
 * key's behaviour sits next to its label.
 */
const KEYPAD_LAYOUT: KeySpec[][] = [
  [
    { label: 'AC', description: 'Clear', variant: 'function', press: (h) => h.onClear() },
    { label: '√', description: 'Square root', variant: 'function', press: (h) => h.onUnary('sqrt') },
    { label: 'xʸ', description: 'Power', variant: 'function', press: (h) => h.onOperation('power') },
    { label: '÷', description: 'Divide', variant: 'accent', press: (h) => h.onOperation('divide') },
  ],
  [
    digitKey('7'),
    digitKey('8'),
    digitKey('9'),
    { label: '×', description: 'Multiply', variant: 'accent', press: (h) => h.onOperation('multiply') },
  ],
  [
    digitKey('4'),
    digitKey('5'),
    digitKey('6'),
    { label: '−', description: 'Subtract', variant: 'accent', press: (h) => h.onOperation('subtract') },
  ],
  [
    digitKey('1'),
    digitKey('2'),
    digitKey('3'),
    { label: '+', description: 'Add', variant: 'accent', press: (h) => h.onOperation('add') },
  ],
  [
    { label: '%', description: 'Percentage', variant: 'function', press: (h) => h.onOperation('percentage') },
    digitKey('0'),
    { label: '.', description: 'Decimal point', variant: 'digit', press: (h) => h.onDecimal() },
    { label: '=', description: 'Equals', variant: 'accent', press: (h) => h.onEvaluate() },
  ],
]

export function Keypad({ disabled = false, ...handlers }: KeypadProps) {
  return (
    <div className="keypad">
      {KEYPAD_LAYOUT.flat().map((key) => (
        <Key
          key={key.label}
          label={key.label}
          description={key.description}
          variant={key.variant}
          disabled={disabled}
          onPress={() => key.press(handlers)}
        />
      ))}
    </div>
  )
}
