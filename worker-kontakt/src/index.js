const ALLOWED_ORIGINS = new Set([
    "https://wildcare.space",
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:8082",
]);
const SOURCE_TAG = "Kontaktformular";
const MAX_BODY_BYTES = 10 * 1024;
const MAX_NAME_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 1800;

function getAllowedOrigin(request) {
    const origin = request.headers.get("Origin");
    if (origin && ALLOWED_ORIGINS.has(origin)) {
        return origin;
    }
    return "https://wildcare.space";
}

function corsHeaders(request) {
    return {
        "Access-Control-Allow-Origin": getAllowedOrigin(request),
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Vary": "Origin",
    };
}

function jsonResponse(request, body, status) {
    return new Response(JSON.stringify(body), {
        status: status || 200,
        headers: Object.assign({ "Content-Type": "application/json" }, corsHeaders(request)),
    });
}

function cleanText(value) {
    return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email) {
    return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isBodyTooLarge(request) {
    const contentLength = request.headers.get("Content-Length");
    return contentLength !== null && Number(contentLength) > MAX_BODY_BYTES;
}

async function createNotionRow(env, data, submissionDate) {
    const language = data.language === "en" ? "en" : "de";
    const note =
        "Kontaktformular wildcare.space — Sprache: " +
        language +
        " — Nachricht: " +
        data.message;

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
                "Name": { title: [{ text: { content: data.name } }] },
                "Email": { email: data.email },
                "Anmeldung Datum": { date: { start: submissionDate } },
                "Nachricht": { rich_text: [{ text: { content: note } }] },
                "Tag": { multi_select: [{ name: SOURCE_TAG }] },
            },
        }),
    });
}

export default {
    async fetch(request, env) {
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders(request) });
        }

        if (request.method !== "POST") {
            return jsonResponse(request, { ok: false, error: "method_not_allowed" }, 405);
        }

        if (isBodyTooLarge(request)) {
            return jsonResponse(request, { ok: false, error: "payload_too_large" }, 413);
        }

        let data;
        try {
            data = await request.json();
        } catch (err) {
            return jsonResponse(request, { ok: false, error: "invalid_json" }, 400);
        }

        // Honeypot: silently succeed without touching Notion.
        if (data.website) {
            return jsonResponse(request, { ok: true });
        }

        const cleaned = {
            name: cleanText(data.name),
            email: cleanText(data.email),
            message: cleanText(data.message),
            language: data.language === "en" ? "en" : "de",
        };

        if (!cleaned.name || cleaned.name.length > MAX_NAME_LENGTH) {
            return jsonResponse(request, { ok: false, error: "invalid_name" }, 400);
        }

        if (!isValidEmail(cleaned.email)) {
            return jsonResponse(request, { ok: false, error: "invalid_email" }, 400);
        }

        if (!cleaned.message || cleaned.message.length > MAX_MESSAGE_LENGTH) {
            return jsonResponse(request, { ok: false, error: "invalid_message" }, 400);
        }

        const submissionDate = new Date().toISOString().slice(0, 10);
        const notionResponse = await createNotionRow(env, cleaned, submissionDate);

        if (!notionResponse.ok) {
            return jsonResponse(request, { ok: false, error: "notion_error" }, 502);
        }

        return jsonResponse(request, { ok: true });
    },
};
