import '@testing-library/jest-dom/vitest'

// jsdom ships no matchMedia, which useTheme needs to read the system preference.
// Tests that care about the preference stub this with their own implementation.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}
