import { createFileRoute } from "@tanstack/react-router";
import type { N8nInboundPayload } from "@/types/domain";

/**
 * Endpoint para receber payloads do n8n.
 * Protegido por header `x-n8n-secret` comparado com env N8N_PANEL_SECRET.
 */
export const Route = createFileRoute("/api/n8n/inbound-whatsapp")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        try {
          const expected = process.env.N8N_PANEL_SECRET;
          const provided = request.headers.get("x-n8n-secret");
          const isDev = process.env.NODE_ENV !== "production";

          if (expected) {
            if (!provided || provided !== expected) {
              return json({ success: false, error: "invalid x-n8n-secret" }, 401);
            }
          } else if (!isDev) {
            return json(
              { success: false, error: "N8N_PANEL_SECRET not configured" },
              500,
            );
          }

          const payload = (await request.json()) as N8nInboundPayload;
          const { handleN8nInboundPayloadAdmin } = await import(
            "@/services/inboundServerService.server"
          );
          return json(await handleN8nInboundPayloadAdmin(payload));
        } catch (err: any) {
          console.error("n8n inbound error:", err);
          return json(
            { success: false, error: err?.message ?? "unknown error" },
            500,
          );
        }
      },
    },
  },
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-n8n-secret",
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}
