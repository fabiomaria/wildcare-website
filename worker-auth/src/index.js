// GitHub OAuth provider for Sveltia CMS (the production branch's admin/config.yml
// `backend.base_url`). Implements the standard Decap/Sveltia CMS GitHub OAuth
// popup flow: /auth redirects to GitHub, /callback exchanges the code for a
// token and hands it back to the CMS popup via postMessage.
//
// Kept as its own worker (not merged into worker/ or worker-kontakt/) per
// CLAUDE.md — this one talks to GitHub's OAuth API, not Notion.

const STATE_COOKIE = "wc_gh_oauth_state";

function getAllowedDomains(env) {
    return (env.ALLOWED_DOMAINS || "")
        .split(",")
        .map((domain) => domain.trim())
        .filter(Boolean);
}

// Only allow the flow to be kicked off from an origin we recognize
// (the deployed site + local Eleventy dev preview). Checks Origin first,
// falling back to Referer since browsers don't always send Origin on a
// top-level navigation/redirect. The GitHub -> /callback request is
// protected by the state cookie instead because GitHub may not send a
// useful Referer/Origin back to us.
function isRequestFromAllowedOrigin(request, env) {
    const allowedDomains = getAllowedDomains(env);
    if (allowedDomains.length === 0) {
        return false;
    }

    const originHeader = request.headers.get("Origin") || request.headers.get("Referer");
    if (!originHeader) {
        return false;
    }

    let host;
    try {
        host = new URL(originHeader).host;
    } catch (err) {
        return false;
    }

    return allowedDomains.includes(host);
}

function textResponse(body, status) {
    return new Response(body, {
        status: status || 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
}

function htmlResponse(body, status) {
    return new Response(body, {
        status: status || 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
}

function randomState() {
    return crypto.randomUUID();
}

function readCookie(request, name) {
    const header = request.headers.get("Cookie");
    if (!header) {
        return null;
    }
    const match = header
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(name + "="));
    return match ? match.slice(name.length + 1) : null;
}

// GET /auth — kicks off the flow: bounce the browser to GitHub's authorize
// screen. The CMS opens this in a popup window.
function handleAuth(request, env) {
    if (!isRequestFromAllowedOrigin(request, env)) {
        return textResponse("Forbidden: origin not allowed", 403);
    }

    if (!env.GITHUB_CLIENT_ID) {
        return textResponse("Server misconfigured: missing GITHUB_CLIENT_ID", 500);
    }

    const requestUrl = new URL(request.url);
    const redirectUri = requestUrl.origin + "/callback";
    const state = randomState();

    const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
    authorizeUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("scope", "repo");
    authorizeUrl.searchParams.set("state", state);

    return new Response(null, {
        status: 302,
        headers: {
            Location: authorizeUrl.toString(),
            // HttpOnly + Secure + Lax: only readable by this worker, only sent
            // back to it, and only over https. Scoped to /callback since
            // that's the only other route that needs it.
            "Set-Cookie":
                STATE_COOKIE +
                "=" +
                state +
                "; Path=/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600",
        },
    });
}

// Builds the HTML page the popup renders after GitHub redirects back here.
// This is the standard Decap/Sveltia CMS postMessage handshake:
//   1. The popup (this page) tells its opener it's ready:
//        window.opener.postMessage("authorizing:github", "*")
//   2. The CMS (the opener) replies with any message once it's listening.
//   3. On receiving that reply, the popup sends the real payload back,
//      targeted at the origin the reply came from (not "*"), then tears
//      down its listener.
// Get this message format wrong (missing "authorization:github:success:"
// prefix, wrong provider name, etc.) and the CMS silently never logs in.
function renderSuccessHtml(token) {
    const payload = JSON.stringify({ token, provider: "github" });
    // JSON.stringify never emits an unescaped single quote, but escape
    // defensively anyway since this string is inlined into a single-quoted
    // JS string literal in the HTML below.
    const safePayload = payload.replace(/'/g, "\\'");

    return `<!DOCTYPE html>
<html>
  <body>
    <script>
      (function() {
        function receiveMessage(message) {
          window.removeEventListener("message", receiveMessage, false);
          window.opener.postMessage(
            'authorization:github:success:${safePayload}',
            message.origin
          );
        }
        window.addEventListener("message", receiveMessage, false);
        window.opener.postMessage("authorizing:github", "*");
      })();
    </script>
  </body>
</html>`;
}

function renderErrorHtml(message) {
    const safeMessage = JSON.stringify(String(message));
    return `<!DOCTYPE html>
<html>
  <body>
    <script>
      (function() {
        function receiveMessage(message) {
          window.removeEventListener("message", receiveMessage, false);
          window.opener.postMessage(
            "authorization:github:error:" + ${safeMessage},
            message.origin
          );
        }
        window.addEventListener("message", receiveMessage, false);
        window.opener.postMessage("authorizing:github", "*");
      })();
    </script>
  </body>
</html>`;
}

// GET /callback — GitHub redirects here with ?code=&state=.
async function handleCallback(request, env) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const expectedState = readCookie(request, STATE_COOKIE);

    if (!code || !state) {
        return textResponse("Bad request: missing code or state", 400);
    }

    if (!expectedState || state !== expectedState) {
        return textResponse("Bad request: state mismatch", 400);
    }

    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
        return textResponse(
            "Server misconfigured: missing GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET",
            500,
        );
    }

    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: url.origin + "/callback",
        }),
    });

    if (!tokenResponse.ok) {
        return htmlResponse(renderErrorHtml("Failed to reach GitHub"), 502);
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
        return htmlResponse(
            renderErrorHtml(tokenData.error_description || "GitHub did not return a token"),
            401,
        );
    }

    return htmlResponse(
        renderSuccessHtml(tokenData.access_token),
        200,
    );
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (request.method !== "GET") {
            return textResponse("Method not allowed", 405);
        }

        if (url.pathname === "/auth" || url.pathname === "/") {
            return handleAuth(request, env);
        }

        if (url.pathname === "/callback") {
            return handleCallback(request, env);
        }

        return textResponse("Not found", 404);
    },
};
