import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ThemeToggle } from './ThemeToggle'

describe('ThemeToggle', () => {
  it.each([
    ['light', 'Switch to dark theme'],
    ['dark', 'Switch to light theme'],
  ] as const)('labels the destination theme when showing %s', (theme, label) => {
    render(<ThemeToggle theme={theme} onToggle={() => {}} />)

    expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
  })

  it('calls back when pressed', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(<ThemeToggle theme="light" onToggle={onToggle} />)

    await user.click(screen.getByRole('button'))

    expect(onToggle).toHaveBeenCalledOnce()
  })
})
