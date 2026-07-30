import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

/** Also read by the inline script in index.html, which runs before first paint. */
export const THEME_STORAGE_KEY = 'calculator-theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * Resolves the active theme, following the operating system until the user
 * picks a side. The choice is remembered; before that, changing the system
 * preference still updates the app live.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme() ?? systemTheme())

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY)
    const syncWithSystem = (event: MediaQueryListEvent) => {
      // An explicit choice wins; only mirror the system while none was made.
      if (readStoredTheme()) return
      setTheme(event.matches ? 'dark' : 'light')
    }

    media.addEventListener('change', syncWithSystem)
    return () => media.removeEventListener('change', syncWithSystem)
  }, [])

  function toggleTheme() {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      storeTheme(next)
      return next
    })
  }

  return { theme, toggleTheme }
}

function systemTheme(): Theme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

// Storage throws when the browser blocks it (private mode, disabled cookies).
// A calculator should still work, so both helpers fail quietly.
function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    /* preference simply will not survive a reload */
  }
}
