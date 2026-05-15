import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"}, try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

function jsonApi(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "Content-Type, Authorization, x-n8n-secret",
    },
  });
}

async function handleGsN8nInboundWebhook(request: Request, env: unknown): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: jsonApi({}).headers });
  if (request.method !== "POST") return jsonApi({ success: false, error: "method_not_allowed" }, 405);

  try {
    const expected =
      process.env.N8N_PANEL_SECRET ?? (env as Record<string, string | undefined>)?.N8N_PANEL_SECRET;
    const provided = request.headers.get("x-n8n-secret");
    if (!expected || !provided || provided !== expected) {
      return jsonApi({ success: false, error: "unauthorized" }, 401);
    }

    const payload = await request.json().catch(() => null);
    if (!payload || (Array.isArray(payload) && payload.length === 0)) {
      return jsonApi({ success: false, error: "empty_message" }, 400);
    }

    const { expandInboundPayloadBatch, handleN8nInboundPayloadAdmin } = await import(
      "./services/inboundServerService.server"
    );
    const batch = expandInboundPayloadBatch(payload);
    if (batch.length === 0) return jsonApi({ success: false, error: "empty_message" }, 400);

    const results = [];
    for (const item of batch) results.push(await handleN8nInboundPayloadAdmin(item));
    return jsonApi({ ...results[0], received: results.length });
  } catch (error) {
    console.error("gs n8n inbound webhook error:", error);
    if (error instanceof Error && error.message === "empty_message") {
      return jsonApi({ success: false, error: "empty_message" }, 400);
    }
    return jsonApi(
      { success: false, error: error instanceof Error ? error.message : "unknown_error" },
      500,
    );
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      if (new URL(request.url).pathname === "/api/public/n8n/inbound-whatsapp") {
        return handleGsN8nInboundWebhook(request, env);
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
