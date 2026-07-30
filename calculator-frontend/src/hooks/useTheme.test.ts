import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { THEME_STORAGE_KEY, useTheme } from './useTheme'

type ChangeListener = (event: MediaQueryListEvent) => void

/** Replaces matchMedia with a stub whose preference the test can change. */
function stubSystemPreference(prefersDark: boolean) {
  const listeners = new Set<ChangeListener>()

  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: prefersDark,
    media: query,
    addEventListener: (_: string, listener: ChangeListener) => listeners.add(listener),
    removeEventListener: (_: string, listener: ChangeListener) => listeners.delete(listener),
  }))

  return {
    change(matches: boolean) {
      act(() => {
        listeners.forEach((listener) => listener({ matches } as MediaQueryListEvent))
      })
    },
  }
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useTheme', () => {
  it.each([
    [true, 'dark'],
    [false, 'light'],
  ])('follows the system preference when nothing was chosen (dark: %s)', (prefersDark, expected) => {
    stubSystemPreference(prefersDark)

    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe(expected)
  })

  it('prefers a stored choice over the system preference', () => {
    stubSystemPreference(true)
    localStorage.setItem(THEME_STORAGE_KEY, 'light')

    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe('light')
  })

  it('ignores a stored value that is not a theme', () => {
    stubSystemPreference(true)
    localStorage.setItem(THEME_STORAGE_KEY, 'purple')

    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe('dark')
  })

  it('exposes the theme on the document element', () => {
    stubSystemPreference(false)

    renderHook(() => useTheme())

    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('flips the theme and remembers the choice', () => {
    stubSystemPreference(false)

    const { result } = renderHook(() => useTheme())
    act(() => result.current.toggleTheme())

    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('keeps tracking the system while no choice has been made', () => {
    const system = stubSystemPreference(false)
    const { result } = renderHook(() => useTheme())

    system.change(true)

    expect(result.current.theme).toBe('dark')
  })

  it('stops tracking the system once the user chooses', () => {
    const system = stubSystemPreference(false)
    const { result } = renderHook(() => useTheme())

    act(() => result.current.toggleTheme())
    system.change(false)

    expect(result.current.theme).toBe('dark')
  })

  it('still works when storage is unavailable', () => {
    stubSystemPreference(false)
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })

    const { result } = renderHook(() => useTheme())
    act(() => result.current.toggleTheme())

    expect(result.current.theme).toBe('dark')

    getItem.mockRestore()
    setItem.mockRestore()
  })
})
