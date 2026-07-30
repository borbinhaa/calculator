import './Key.css'

export type KeyVariant = 'digit' | 'function' | 'accent'

export type KeyProps = {
  label: string
  onPress: () => void
  variant?: KeyVariant
  /** Accessible name, required whenever the label is a symbol such as ÷ or √. */
  description?: string
  disabled?: boolean
}

export function Key({
  label,
  onPress,
  variant = 'digit',
  description,
  disabled = false,
}: KeyProps) {
  return (
    <button
      type="button"
      className={`key key--${variant}`}
      onClick={onPress}
      aria-label={description}
      disabled={disabled}
    >
      {label}
    </button>
  )
}
