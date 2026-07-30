/**
 * Thin typed wrapper around the calculator REST API.
 *
 * Every failure mode — transport, HTTP error, malformed payload — surfaces as a
 * CalculatorApiError carrying a stable code, so callers never have to inspect
 * Response objects or guess at the shape of an error body.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export const BINARY_OPERATIONS = [
  'add',
  'subtract',
  'multiply',
  'divide',
  'power',
  'percentage',
] as const

export const UNARY_OPERATIONS = ['sqrt'] as const

export type BinaryOperation = (typeof BINARY_OPERATIONS)[number]
export type UnaryOperation = (typeof UNARY_OPERATIONS)[number]

export class CalculatorApiError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'CalculatorApiError'
    this.code = code
  }
}

export function calculateBinary(
  operation: BinaryOperation,
  value1: number,
  value2: number,
): Promise<number> {
  return requestResult(operation, { value1, value2 })
}

export function calculateUnary(operation: UnaryOperation, value1: number): Promise<number> {
  return requestResult(operation, { value1 })
}

async function requestResult(
  operation: BinaryOperation | UnaryOperation,
  payload: Record<string, number>,
): Promise<number> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/${operation}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new CalculatorApiError(
      'network_error',
      'Could not reach the calculator service. Check your connection and try again.',
    )
  }

  const body = await readJson(response)

  if (!response.ok) {
    throw toApiError(body, response.status)
  }

  const result = extractResult(body)
  if (result === undefined) {
    throw new CalculatorApiError(
      'invalid_response',
      'The calculator service returned an unexpected response.',
    )
  }

  return result
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function extractResult(body: unknown): number | undefined {
  if (typeof body !== 'object' || body === null) return undefined

  const { result } = body as { result?: unknown }
  return typeof result === 'number' && Number.isFinite(result) ? result : undefined
}

function toApiError(body: unknown, status: number): CalculatorApiError {
  if (typeof body === 'object' && body !== null) {
    const { error } = body as { error?: { code?: unknown; message?: unknown } }
    if (typeof error?.code === 'string' && typeof error.message === 'string') {
      return new CalculatorApiError(error.code, error.message)
    }
  }

  return new CalculatorApiError('unexpected_error', `The calculator service failed (HTTP ${status}).`)
}
