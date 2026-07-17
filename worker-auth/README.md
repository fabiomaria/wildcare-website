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

## Status: scaffolded, not deployed, not wired up

This worker has **not** been deployed and `admin/config.yml`'s
`backend.base_url` is still commented out. Nothing changes for the live site
until the manual steps below are done by someone with GitHub org admin access
and Cloudflare account access.

## Routes

- `GET /auth` (also served at `GET /`) — starts the flow. Validates the
  request's `Origin`/`Referer` against `ALLOWED_DOMAINS`, sets a short-lived
  `HttpOnly` state cookie (scoped to `/callback`) for CSRF protection, and
  redirects to `https://github.com/login/oauth/authorize` with `scope=repo`
  (Sveltia/Decap needs repo write access to commit content changes).
- `GET /callback` — GitHub redirects here with `?code=&state=`. Validates the
  origin again, validates `state` against the cookie set in `/auth`, exchanges
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
  to `wildcare.space,localhost:8080,localhost:8081,localhost:8082` (the
  deployed domain plus the ports used by `npm run dev`'s Eleventy preview
  server — adjust if the site owner's local dev setup differs).
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` (Worker secrets, **not**
  committed anywhere in this repo) — credentials from the GitHub OAuth App
  created for this integration.

## Manual setup still required before this is live

This worker cannot be used for real login yet. The following steps need
someone with the right GitHub and Cloudflare access and are **not** done by
this scaffold:

1. Create a GitHub OAuth App at <https://github.com/settings/developers>
   (or under the org, if the repo is org-owned) with:
   - Homepage URL: the deployed site, e.g. `https://wildcare.space`
   - Authorization callback URL: `<deployed-worker-url>/callback`
     (e.g. `https://wildcare-cms-auth.<subdomain>.workers.dev/callback`, or a
     custom domain/route if one is set up for this worker)
2. Run `wrangler secret put GITHUB_CLIENT_ID` and paste in the OAuth App's
   client ID.
3. Run `wrangler secret put GITHUB_CLIENT_SECRET` and paste in the OAuth
   App's client secret.
4. Run `wrangler deploy` to publish the worker and get its real URL.
5. Update `ALLOWED_DOMAINS` in `wrangler.toml` if the deployed domain or local
   dev ports differ from what's currently set, then redeploy.
6. In `admin/config.yml`, uncomment and fill in `backend.base_url` with the
   deployed worker's URL (the line is currently commented out at the top of
   that file, right under `backend.branch`). Do this as an explicit follow-up
   task — it's out of scope for this scaffold.

None of the above has been done here: no `wrangler deploy`, no
`wrangler secret put` with real values, and `admin/config.yml` is untouched.
