import './Display.css'

export type DisplayProps = {
  /** The pending operation, e.g. "12 +". Empty when nothing is pending. */
  expression: string
  value: string
  isCalculating?: boolean
}

export function Display({ expression, value, isCalculating = false }: DisplayProps) {
  return (
    <div className="display" aria-busy={isCalculating}>
      <span className="display__expression">{expression}</span>
      {/* <output> carries role="status", so results are announced as they land. */}
      <output className="display__value" aria-label="Result">
        {value}
      </output>
      {isCalculating && (
        <span className="display__progress" role="progressbar" aria-label="Calculating" />
      )}
    </div>
  )
}
