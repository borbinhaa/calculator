# Calculator

A full-stack calculator: a React + TypeScript interface backed by a Go REST API.
Every arithmetic operation — including the digits you see appear on the display —
is resolved by the server. The browser never computes a result on its own.

```
┌──────────────────────────┐         ┌──────────────────────────┐
│  calculator-frontend     │  POST   │  calculator-backend      │
│  React 19 + TypeScript   │ ──────► │  Go 1.26 + Gin           │
│  Vite, plain CSS tokens  │  JSON   │  layered: api ▸ domain   │
└──────────────────────────┘ ◄────── └──────────────────────────┘
                              result
```

- **Operations:** addition, subtraction, multiplication, division, exponentiation,
  square root, percentage
- **Tests:** 85 on the backend, 77 on the frontend
- **Coverage:** 100% of every function in the backend's `api` and `calculator`
  packages; 100% of lines and functions on the frontend

---

## Repository layout

```
calculator/
├── calculator-backend/           # Go + Gin REST API
│   ├── cmd/server/               # entry point: reads env, starts the server
│   ├── internal/api/             # HTTP layer: routing, binding, error mapping
│   └── internal/calculator/      # domain: pure arithmetic, no HTTP awareness
├── calculator-frontend/          # React + TypeScript SPA
│   ├── src/api/                  # typed API client
│   ├── src/state/                # pure calculator state machine (reducer)
│   ├── src/hooks/                # useCalculator, useTheme
│   ├── src/components/
│   │   ├── calculator/           # feature components: Calculator, Display, Keypad
│   │   └── ui/                   # domain-free primitives: Key, ErrorBanner, ThemeToggle
│   └── src/styles/               # design tokens and base styles
├── docker-compose.yml
├── README.md
└── PROMPTS.md                    # AI prompts used to build this
```

---

## Running it

### With Docker (everything at once)

Requires Docker with Compose v2.

```bash
docker compose up --build
```

Open **http://localhost:3000**. Stop with `docker compose down`.

Only the frontend publishes a port. nginx serves the built assets and proxies
`/api` to the backend over the internal network, so the API is not exposed to
the host and the browser only ever talks to one origin.

### Locally (two terminals)

Requires Go 1.26+ and Node 22+.

```bash
# terminal 1 — API on :8080
cd calculator-backend
go run ./cmd/server

# terminal 2 — app on :5173
cd calculator-frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` to `localhost:8080`, so the
browser stays on a single origin here too.

**Backend environment variables**

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | Port the API listens on |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated origins allowed to call the API from a browser |

**Frontend environment variables**

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `/api/v1` | API base path; relative by default so requests go through the proxy |
| `VITE_API_TARGET` | `http://localhost:8080` | Where the Vite dev server forwards `/api` |

---

## Tests and coverage

### Backend

```bash
cd calculator-backend
go test ./...                              # run everything
go test ./... -coverprofile=coverage.out   # with a coverage profile
go tool cover -func=coverage.out           # per-function summary
go tool cover -html=coverage.out           # browsable HTML report
```

Every function in `internal/calculator` and `internal/api` is at 100%. The
overall figure is **84.6%**, the remainder being `cmd/server/main.go` — it only
reads environment variables and starts the server, so testing it would assert
nothing the integration tests do not already cover.

### Frontend

```bash
cd calculator-frontend
npm test                  # run everything
npm run test:watch        # re-run on save
npm run test:coverage     # writes coverage/index.html
```

| Metric | Result |
|---|---|
| Lines | 100% |
| Functions | 100% |
| Statements | 99.4% |
| Branches | 94.5% |

Two levels are covered on both sides: **unit tests** for pure logic (the
arithmetic functions, the state machine) and **integration tests** exercising the
real stack — `httptest` through Gin's full middleware chain on the backend, React
Testing Library driving actual clicks and keystrokes on the frontend.

---

## API

Base path `/api/v1`. All operations are `POST` with a JSON body and return
`{"result": <number>}` on success.

| Endpoint | Body | Meaning |
|---|---|---|
| `/add` | `{"value1", "value2"}` | `value1 + value2` |
| `/subtract` | `{"value1", "value2"}` | `value1 - value2` |
| `/multiply` | `{"value1", "value2"}` | `value1 × value2` |
| `/divide` | `{"value1", "value2"}` | `value1 ÷ value2` |
| `/power` | `{"value1", "value2"}` | `value1` raised to `value2` |
| `/sqrt` | `{"value1"}` | square root of `value1` |
| `/percentage` | `{"value1", "value2"}` | `value1` percent of `value2` |

`GET /healthz` returns `{"status":"ok"}` for liveness checks.

### Examples

```bash
# Addition
curl -X POST http://localhost:8080/api/v1/add \
  -H 'Content-Type: application/json' \
  -d '{"value1": 12, "value2": 3}'
# {"result":15}

# Square root — a single operand
curl -X POST http://localhost:8080/api/v1/sqrt \
  -H 'Content-Type: application/json' \
  -d '{"value1": 9}'
# {"result":3}

# Percentage — 12.5% of 80
curl -X POST http://localhost:8080/api/v1/percentage \
  -H 'Content-Type: application/json' \
  -d '{"value1": 12.5, "value2": 80}'
# {"result":10}

# Exponentiation
curl -X POST http://localhost:8080/api/v1/power \
  -H 'Content-Type: application/json' \
  -d '{"value1": 2, "value2": 10}'
# {"result":1024}

# Division by zero — a well-formed request the server cannot fulfil
curl -X POST http://localhost:8080/api/v1/divide \
  -H 'Content-Type: application/json' \
  -d '{"value1": 12, "value2": 0}'
# HTTP 422
# {"error":{"code":"division_by_zero","message":"division by zero is not allowed"}}

# Malformed request — a required operand is missing
curl -X POST http://localhost:8080/api/v1/add \
  -H 'Content-Type: application/json' \
  -d '{"value1": 1}'
# HTTP 400
# {"error":{"code":"invalid_request","message":"body must be a JSON object with numeric fields \"value1\" and \"value2\""}}
```

### Errors

Failures share one shape, so a client can branch on `code` without parsing prose:

```json
{ "error": { "code": "division_by_zero", "message": "division by zero is not allowed" } }
```

| Code | Status | Cause |
|---|---|---|
| `invalid_request` | 400 | Malformed JSON, missing operand, or a non-numeric value |
| `division_by_zero` | 422 | The divisor is zero |
| `negative_square_root` | 422 | Square root of a negative number |
| `result_not_finite` | 422 | The result overflowed to ±Inf or NaN |

---

## Using the app

Click the keys or use the keyboard:

| Key | Action |
|---|---|
| `0`–`9`, `.`, `,` | Enter a number |
| `+` `-` `*` `/` `^` `%` | Choose an operation |
| `Enter` or `=` | Calculate |
| `Esc` | Clear |

Operations chain left to right: typing `2 + 3 ×` resolves `2 + 3` first and
carries `5` into the next operation, the way a physical calculator behaves.

The app follows the operating system's light or dark setting, and the button in
the header overrides it. That choice is remembered across reloads.

---

## Design decisions

**All arithmetic happens on the server.** The frontend never computes a result,
not even to save a round trip on `2 + 2`. Duplicating the rules in two languages
is how the two implementations drift apart; keeping one authority means division
by zero is rejected in exactly one place.

**One endpoint per operation, not a single `/calculate?op=`.** Each URL is
self-documenting, and `/sqrt` can require a different payload than `/divide`
without either one accepting a field it ignores. The handlers stay thin because
`handleBinary` and `handleUnary` adapt any domain function to HTTP, so a new
operation is a domain function plus one route.

**Two layers, not MVC.** A JSON API has no view to render, so MVC would be the
wrong label. `internal/calculator` holds pure functions that know nothing about
HTTP; `internal/api` translates between JSON and those functions and maps domain
errors onto status codes. Dependencies point one way, which is what makes the
arithmetic testable without a server and the handlers testable without a browser.
There is no service layer or dependency injection: for seven pure functions that
would be ceremony, not architecture.

**400 and 422 mean different things.** `400` says the request itself is broken —
malformed JSON, a missing operand. `422` says the request was understood
perfectly but describes something impossible, like dividing by zero. The
distinction tells a client whether to fix its payload or tell the user their
input cannot work.

**Operands are pointers in the request struct.** `*float64` distinguishes an
absent field from a legitimate `0`. With a plain `float64`, `{"value1": 0}` and
`{}` are indistinguishable after decoding, and `0 + 0` would be rejected as
incomplete.

**Overflow is an error, not a value.** Any operation whose result is `±Inf` or
`NaN` returns `result_not_finite` rather than serialising `null` into JSON, which
is what `encoding/json` does with those values.

**Percentage is `value1` percent of `value2`.** Physical calculators treat `%`
contextually — `200 + 10 %` yields 220 while `200 × 10 %` yields 20 — which makes
the result depend on the preceding operator. That is a UI convention, and putting
it in the API would mean the server tracking what the user pressed earlier. The
endpoint stays a stateless function; the UI treats `%` as a binary operator, so
`10 % 200 =` reads as "10% of 200" and gives 20.

**Floating point noise is trimmed at the edge, not in the domain.** The API
returns exactly what IEEE 754 produces, so `0.1 + 0.2` really is
`0.30000000000000004`. The display rounds to 12 significant digits, showing
`0.3`. Rounding on the server would quietly discard precision the caller may
want; rounding in the UI keeps the API honest and the display readable.

**The browser only ever talks to one origin.** In development Vite proxies
`/api` to the Go server; in Docker nginx does the same. CORS therefore never
applies to normal use, and the allow-list exists only as a guard: a page on
another domain that tries to call the API gets a `403`. Because browsers attach
an `Origin` header even to same-origin `POST`s, each deployment has to declare
its own origin — `docker-compose.yml` sets `CORS_ALLOWED_ORIGINS` accordingly.

**The UI is built from primitives that do not know about calculators.** `Key`
takes a label and a callback; `Keypad` takes handlers and renders a layout that
is described as data rather than markup; `Display` and `ErrorBanner` take values.
Only `Calculator` knows the `useCalculator` hook exists. The state machine is a
pure reducer, which is why chaining, decimal entry, and error recovery can be
tested without rendering anything.

**Components are grouped by what they know, not by file type.** `components/ui/`
holds pieces with no domain knowledge — `Key` is a styled button with `default`,
`secondary`, and `primary` variants, and would drop into any project unchanged.
`components/calculator/` holds the pieces that understand operations and
operands. The boundary is a real constraint: `ui/` never imports from
`calculator/`, so the dependency arrow points one way, mirroring how
`internal/api` depends on `internal/calculator` and never the reverse.

This matters more as a project grows than folder-per-component would. A flat
`components/` directory stops being scannable somewhere past a dozen entries, and
splitting each into its own folder only relocates the problem — you still face a
long list, now of directories. Splitting by responsibility means a new feature
adds a sibling folder rather than more entries in a shared one, and it answers
"can I reuse this?" by location alone. For the same reason `state/` holds the
reducer instead of `hooks/`: it is a pure function, and a folder named `hooks`
should contain hooks.

**Styling is plain CSS driven by semantic tokens.** No component contains a hex
value; they reference roles like `--color-accent` and `--color-danger`. Each role
carries both themes in a single `light-dark()` pair, so there is no duplicated
palette to keep in sync and switching theme only changes `color-scheme`. Light
and dark are authored together rather than by inverting: the accent key is
white-on-orange in light and near-black-on-orange in dark, because those are the
combinations that clear WCAG AA contrast in their own theme. Touch targets are
48px, focus rings are visible, the display uses tabular figures so digits do not
jitter as they change, and `prefers-reduced-motion` disables animation.

**The theme follows the system until the user disagrees.** No explicit choice
means no stored value and no `data-theme` attribute, so the CSS tracks
`prefers-color-scheme` — including live changes while the app is open. Pressing
the toggle pins a theme and persists it. A four-line inline script in
`index.html` applies a stored theme before the first paint; without it the page
would render in the system theme and visibly swap once React mounted.

**Docker images carry only what they need.** The backend compiles to a static
binary and ships on `distroless/static` — no shell, no package manager, non-root
— at ~33 MB. The frontend builds with `npm ci` so the lockfile decides what gets
installed, then ships as static files behind nginx.

---

## Assumptions

- **No authentication or rate limiting.** The brief describes a calculator, not a
  multi-tenant service.
- **No history or persistence.** Results are not stored, so there is no database.
- **`float64` throughout.** Appropriate for a calculator; a financial application
  would need decimal arithmetic instead.
- **Entry is capped at 15 digits**, beyond which `float64` cannot represent
  integers exactly.
- **Unary operations apply immediately** to whatever is on the display, and leave
  a pending operation intact — `9 + 16 √ =` resolves as `9 + 4`.
