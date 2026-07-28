# worker-auth — Sveltia CMS GitHub OAuth provider

Cloudflare Worker that implements the GitHub OAuth "popup" flow Sveltia CMS
(and Decap CMS, which it's compatible with) expects from a `backend.base_url`
in `admin/config.yml`. Sveltia CMS opens `<base_url>/auth` in a popup window;
this worker redirects it to GitHub, GitHub redirects back to `/callback` with
an authorization code, and this worker exchanges that code for an access
token and hands it to the popup's opener via `postMessage`.

This is a separate worker from `worker/` (homepage email signup → Notion) and
`worker-kontakt/` (contact form → Notion) by design — see the repo's
`CLAUDE.md`. It talks to GitHub's OAuth API, not Notion, and has nothing else
in common with them.

## Status

Deployed at:

```text
https://wildcare-cms-auth.fabiogerhold.workers.dev
```

`GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set as Cloudflare Worker
secrets. `admin/config.yml` must point `backend.base_url` at the deployed
worker URL for live CMS login.

## Routes

- `GET /auth` (also served at `GET /`) — starts the flow. Validates the
  request's `Origin`/`Referer` against `ALLOWED_DOMAINS` when the browser sends
  one; top-level OAuth popups are also allowed when both headers are omitted.
  It sets a short-lived `HttpOnly` state cookie (scoped to `/callback`) for
  CSRF protection, and redirects to
  `https://github.com/login/oauth/authorize` with `scope=repo`
  (Sveltia/Decap needs repo write access to commit content changes).
- `GET /callback` — GitHub redirects here with `?code=&state=`. Validates
  `state` against the cookie set in `/auth`, exchanges
  `code` for an access token via `POST
  https://github.com/login/oauth/access_token`, then returns a small HTML page
  that runs the standard Decap/Sveltia `postMessage` handshake:
  1. the page tells its opener it's ready: `postMessage("authorizing:github", "*")`
  2. once the opener (the CMS) replies, the page sends the real payload,
     targeted at the origin of that reply:
     `"authorization:github:success:" + JSON.stringify({ token, provider: "github" })`

  Getting this message format wrong (prefix, provider name, target origin) is
  the classic way this integration silently fails to log in, so it's worth
  checking these two literal strings first if login stops working.

## Environment

- `ALLOWED_DOMAINS` (plain var, set in `wrangler.toml`) — comma-separated list
  of `host[:port]` values allowed to start the flow, checked against the
  request's `Origin`/`Referer`. Not secret, just an allowlist. Currently set
  to `wildcare.space,www.wildcare.space,localhost:8080,localhost:8081,localhost:8082` (the
  deployed domain plus the ports used by `npm run dev`'s Eleventy preview
  server — adjust if the site owner's local dev setup differs).
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` (Worker secrets, **not**
  committed anywhere in this repo) — credentials from the GitHub OAuth App
  created for this integration.

## Manual setup

GitHub OAuth App settings:

- Homepage URL: `https://wildcare.space`
- Authorization callback URL:
  `https://wildcare-cms-auth.fabiogerhold.workers.dev/callback`

If the callback URL changes, update the OAuth App, update `admin/config.yml`,
and redeploy if `ALLOWED_DOMAINS` changes.
