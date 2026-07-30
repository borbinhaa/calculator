# AI prompts used

This project was built with Claude Code.

## Main prompt

The assignment brief, pasted verbatim, followed by:

> I need to build this. Plan it in multiple small steps: after each API endpoint
> or service setup is finished, stop and wait for me to review and commit. Use
> the `ui-ux-pro-max` skill and build reusable components on the frontend. For
> the backend, use Gin and follow its idiomatic patterns.

That last instruction shaped the whole session. Rather than generating the
application in one pass, the work was split into fourteen checkpoints — one per
API endpoint, one per frontend layer — and stopped at each for review. That is
why the commit history reads as a sequence of small, reviewable units instead of
a single large drop of generated code.

## Follow-up corrections

Each of these was a separate prompt during the build:

- Name the projects `calculator-backend` and `calculator-frontend`.
- Rename the API parameters from `a`/`b` to `value1`/`value2`.
- Remove the subtitle under the page title.
- The calculator is too narrow — and make its width fixed. It should not grow and
  shrink depending on the value inside it. Set it to 23rem.

Plus questions asked before accepting the generated code, whose answers are
reflected in the README: why the test files sit beside the source in Go, which
architectural pattern the backend follows, why division by zero returns 422
rather than 404, and why `12.5%` of `80` is `10`.

The width prompt uncovered a real bug: `body` used `place-items: center`, which
sizes a grid column to its content, so a long number in the display stretched the
entire layout. The fix was a column of definite width.

## Where the AI was overruled

**A bug that passed automated checks was caught by hand.** After the Docker stack
came up, the browser returned `403 Forbidden` on every calculation. The cause:
browsers attach an `Origin` header even to same-origin `POST` requests, and the
API only allowed the Vite dev origin, so Gin's CORS middleware rejected
everything. The `curl` verifications had passed because `curl` sends no `Origin`.
The fix set `CORS_ALLOWED_ORIGINS` in `docker-compose.yml` and added a `TestCORS`
case covering allowed, disallowed, and absent origins — the regression test that
would have caught it in the first place.
