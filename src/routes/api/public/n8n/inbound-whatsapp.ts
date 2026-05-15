import { createFileRoute } from "@tanstack/react-router";
import type { N8nInboundPayload } from "@/types/domain";

export const Route = createFileRoute("/api/public/n8n/inbound-whatsapp")({
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
              return json(
                { success: false, error: "invalid x-n8n-secret" },
                401,
              );
            }
          } else if (!isDev) {
            return json(
              { success: false, error: "N8N_PANEL_SECRET not configured" },
              500,
            );
          }

          const payload = (await request.json()) as N8nInboundPayload;
          const { expandInboundPayloadBatch, handleN8nInboundPayloadAdmin } = await import(
            "@/services/inboundServerService.server"
          );
          const batch = expandInboundPayloadBatch(payload);
          const results = [];
          for (const item of batch) results.push(await handleN8nInboundPayloadAdmin(item));
          return json(batch.length === 1 ? results[0] : { success: true, ok: results.length, results });
        } catch (err: any) {
          console.error("public n8n inbound error:", err);
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
