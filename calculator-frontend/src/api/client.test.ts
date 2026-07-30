import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  BINARY_OPERATIONS,
  CalculatorApiError,
  calculateBinary,
  calculateUnary,
} from './client'

const fetchMock = vi.fn()

/** Builds a Response-like object with just the surface the client consumes. */
function jsonResponse(body: unknown, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body }
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('calculateBinary', () => {
  it('posts both operands and returns the result', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ result: 15 }))

    await expect(calculateBinary('add', 12, 3)).resolves.toBe(15)

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value1: 12, value2: 3 }),
    })
  })

  it.each(BINARY_OPERATIONS)('targets the %s endpoint', async (operation) => {
    fetchMock.mockResolvedValue(jsonResponse({ result: 1 }))

    await calculateBinary(operation, 1, 1)

    expect(fetchMock).toHaveBeenCalledWith(`/api/v1/${operation}`, expect.anything())
  })
})

describe('calculateUnary', () => {
  it('posts a single operand and returns the result', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ result: 3 }))

    await expect(calculateUnary('sqrt', 9)).resolves.toBe(3)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/sqrt',
      expect.objectContaining({ body: JSON.stringify({ value1: 9 }) }),
    )
  })
})

describe('error handling', () => {
  it('surfaces the API error code and message', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { error: { code: 'division_by_zero', message: 'division by zero is not allowed' } },
        { ok: false, status: 422 },
      ),
    )

    await expect(calculateBinary('divide', 12, 0)).rejects.toMatchObject({
      code: 'division_by_zero',
      message: 'division by zero is not allowed',
    })
  })

  it('falls back to a generic error when the body is not a known error shape', async () => {
    fetchMock.mockResolvedValue(jsonResponse('gateway down', { ok: false, status: 502 }))

    await expect(calculateBinary('add', 1, 2)).rejects.toMatchObject({
      code: 'unexpected_error',
    })
  })

  it('falls back to a generic error when the body is not JSON at all', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON')
      },
    })

    await expect(calculateBinary('add', 1, 2)).rejects.toMatchObject({
      code: 'unexpected_error',
      message: 'The calculator service failed (HTTP 502).',
    })
  })

  it('rejects a successful response that is not an object', async () => {
    fetchMock.mockResolvedValue(jsonResponse(null))

    await expect(calculateBinary('add', 12, 3)).rejects.toMatchObject({
      code: 'invalid_response',
    })
  })

  it('reports a network error when the request never completes', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(calculateBinary('add', 1, 2)).rejects.toMatchObject({ code: 'network_error' })
  })

  it('rejects a successful response without a numeric result', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ result: 'fifteen' }))

    await expect(calculateBinary('add', 12, 3)).rejects.toMatchObject({
      code: 'invalid_response',
    })
  })

  it('throws CalculatorApiError instances', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(calculateBinary('add', 1, 2)).rejects.toBeInstanceOf(CalculatorApiError)
  })
})
