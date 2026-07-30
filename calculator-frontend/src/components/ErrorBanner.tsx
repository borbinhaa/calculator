import './ErrorBanner.css'

export type ErrorBannerProps = {
  message: string | null
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) return null

  return (
    <p className="error-banner" role="alert">
      {/* The icon keeps the meaning readable without relying on colour alone. */}
      <svg className="error-banner__icon" viewBox="0 0 20 20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 3.5a.9.9 0 01.9.9v4.2a.9.9 0 11-1.8 0V6.4a.9.9 0 01.9-.9zm0 9.4a1.1 1.1 0 110-2.2 1.1 1.1 0 010 2.2z"
        />
      </svg>
      {message}
    </p>
  )
}
