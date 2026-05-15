import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/n8n/inbound-whatsapp")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        try {
          const expected = process.env.N8N_PANEL_SECRET;
          const provided = request.headers.get("x-n8n-secret");

          if (!expected || !provided || provided !== expected) {
            return json({ success: false, error: "unauthorized" }, 401);
          }

          const payload = await request.json().catch(() => null);
          if (!payload || (Array.isArray(payload) && payload.length === 0)) {
            return json({ success: false, error: "empty_message" }, 400);
          }

          const { expandInboundPayloadBatch, handleN8nInboundPayloadAdmin } = await import(
            "@/services/inboundServerService.server"
          );
          const batch = expandInboundPayloadBatch(payload);
          if (batch.length === 0) return json({ success: false, error: "empty_message" }, 400);

          const results = [];
          for (const item of batch) results.push(await handleN8nInboundPayloadAdmin(item));
          const first = results[0];
          return json({ ...first, received: results.length });
        } catch (err: any) {
          console.error("public n8n inbound error:", err);
          if (err?.message === "empty_message") {
            return json({ success: false, error: "empty_message" }, 400);
          }
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
