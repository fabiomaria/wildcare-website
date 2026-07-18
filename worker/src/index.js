const ALLOWED_ORIGIN = "https://wildcare.space";

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
}

function jsonResponse(body, status) {
    return new Response(JSON.stringify(body), {
        status: status || 200,
        headers: Object.assign({ "Content-Type": "application/json" }, corsHeaders()),
    });
}

function isValidEmail(email) {
    return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Writes a row to the existing "Wild Care Anmeldungen" Notion database.
// That database has no Consent/Language/Source columns (see CLAUDE.md), so
// consent + language + source are recorded as a human-readable text note in
// the existing `Nachricht` rich-text property. Field mapping:
//   Name (title)         <- first name (email for legacy clients)
//   Email (email)        <- email
//   Anmeldung Datum (date) <- submission date (YYYY-MM-DD)
//   Nachricht (rich_text)  <- the note
async function createNotionRow(env, firstName, email, language, submissionDate) {
    const note =
        "E-Mail-Verteiler (kommende Events) — Anmeldung über Startseite — Einwilligung erteilt — Sprache: " + language;

    return fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + env.NOTION_TOKEN,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            parent: { database_id: env.NOTION_DATABASE_ID },
            properties: {
                "Name": { title: [{ text: { content: firstName || email } }] },
                "Email": { email: email },
                "Anmeldung Datum": { date: { start: submissionDate } },
                "Nachricht": { rich_text: [{ text: { content: note } }] },
            },
        }),
    });
}

export default {
    async fetch(request, env) {
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders() });
        }

        if (request.method !== "POST") {
            return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
        }

        let data;
        try {
            data = await request.json();
        } catch (err) {
            return jsonResponse({ ok: false, error: "invalid_json" }, 400);
        }

        // Honeypot: silently succeed without touching Notion.
        if (data.website) {
            return jsonResponse({ ok: true });
        }

        if (!isValidEmail(data.email)) {
            return jsonResponse({ ok: false, error: "invalid_email" }, 400);
        }

        if (data.consent !== true) {
            return jsonResponse({ ok: false, error: "consent_required" }, 400);
        }

        const language = data.language === "en" ? "en" : "de";
        const submissionDate = new Date().toISOString().slice(0, 10);

        const firstName = typeof data.firstName === "string" ? data.firstName.trim().slice(0, 80) : "";
        const notionResponse = await createNotionRow(env, firstName, data.email, language, submissionDate);

        if (!notionResponse.ok) {
            return jsonResponse({ ok: false, error: "notion_error" }, 502);
        }

        return jsonResponse({ ok: true });
    },
};
