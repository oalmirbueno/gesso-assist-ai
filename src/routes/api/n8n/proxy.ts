import { createFileRoute } from "@tanstack/react-router";

/**
 * Proxy seguro do painel Lovable -> n8n.
 *
 * O frontend NUNCA fala com o n8n diretamente. Ele chama este endpoint,
 * que no servidor injeta o header `x-n8n-secret` lido de N8N_PANEL_SECRET
 * e despacha para a URL correta do n8n.
 */
const N8N_BASE = "https://n8n.srv942445.hstgr.cloud/webhook";

const TARGETS = {
  test_connection: `${N8N_BASE}/gs-gesso-panel-test`,
  ai_control: `${N8N_BASE}/gs-gesso-ai-control`,
  human_outbound: `${N8N_BASE}/gs-gesso-human-outbound`,
  learning_feedback: `${N8N_BASE}/gs-gesso-learning-feedback`,
  inbound_to_panel: `${N8N_BASE}/gs-gesso-inbound-to-panel`,
} as const;

type TargetKey = keyof typeof TARGETS;

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

export const Route = createFileRoute("/api/n8n/proxy")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        try {
          const secret = process.env.N8N_PANEL_SECRET;
          if (!secret) {
            return json(
              { ok: false, error: "N8N_PANEL_SECRET not configured on server" },
              500,
            );
          }

          const body = (await request.json()) as {
            target?: TargetKey;
            payload?: unknown;
          };
          const target = body?.target;
          if (!target || !(target in TARGETS)) {
            return json({ ok: false, error: "invalid target" }, 400);
          }

          const url = TARGETS[target];
          const res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-n8n-secret": secret,
            },
            body: JSON.stringify(body.payload ?? {}),
          });

          const text = await res.text();
          let parsed: any = null;
          try {
            parsed = text ? JSON.parse(text) : null;
          } catch {
            parsed = { raw: text };
          }

          return json(
            {
              ok: res.ok && (parsed?.ok ?? true),
              status: res.status,
              target,
              response: parsed,
            },
            res.ok ? 200 : 502,
          );
        } catch (err: any) {
          console.error("n8n proxy error:", err);
          return json(
            { ok: false, error: err?.message ?? "unknown error" },
            500,
          );
        }
      },
    },
  },
});
