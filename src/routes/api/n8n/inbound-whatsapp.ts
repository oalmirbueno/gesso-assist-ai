import { createFileRoute } from "@tanstack/react-router";
import type { N8nInboundPayload } from "@/types/domain";

/**
 * Public endpoint to receive payloads from n8n.
 * URL: /api/n8n/inbound-whatsapp
 *
 * NOTE: For now this accepts any payload (no signature validation).
 * Add an HMAC / shared-secret check before going to production.
 */
export const Route = createFileRoute("/api/n8n/inbound-whatsapp")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: corsHeaders(),
        }),
      POST: async ({ request }) => {
        try {
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
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}
