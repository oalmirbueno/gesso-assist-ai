import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
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

          if (!payload?.contact?.phone) {
            return json({ success: false, error: "contact.phone required" }, 400);
          }

          // Use service role on the server to bypass RLS for webhook ingestion.
          const url =
            process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
          const serviceKey =
            process.env.SUPABASE_SERVICE_ROLE_KEY ??
            process.env.SUPABASE_PUBLISHABLE_KEY ??
            import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

          const supabase = createClient(url!, serviceKey!, {
            auth: { autoRefreshToken: false, persistSession: false },
          });

          // Inline the inbound flow (server-side, no auth header).
          const { data: contact, error: cErr } = await supabase
            .from("contacts")
            .upsert(
              {
                phone: payload.contact.phone,
                name: payload.contact.name ?? null,
                source: payload.contact.source ?? "whatsapp_cloud_api",
                stage: payload.contact.stage ?? "novo",
                tags: payload.contact.tags ?? [],
                city: payload.contact.city ?? null,
                neighborhood: payload.contact.neighborhood ?? null,
                customer_type: payload.contact.customer_type ?? null,
              },
              { onConflict: "phone" },
            )
            .select("*")
            .single();
          if (cErr) throw cErr;

          let { data: conv } = await supabase
            .from("conversations")
            .select("*")
            .eq("contact_id", contact.id)
            .neq("status", "resolvida")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!conv) {
            const { data, error } = await supabase
              .from("conversations")
              .insert({
                contact_id: contact.id,
                status: payload.conversation?.status ?? "nova",
                ai_enabled: payload.conversation?.ai_enabled ?? true,
                needs_human: payload.conversation?.needs_human ?? false,
                priority: payload.conversation?.priority ?? "normal",
                last_message_at: new Date().toISOString(),
              })
              .select("*")
              .single();
            if (error) throw error;
            conv = data;
          } else if (payload.conversation) {
            const { data, error } = await supabase
              .from("conversations")
              .update({
                status: payload.conversation.status ?? conv.status,
                ai_enabled:
                  payload.conversation.ai_enabled ?? conv.ai_enabled,
                needs_human:
                  payload.conversation.needs_human ?? conv.needs_human,
                needs_human_reason:
                  payload.conversation.needs_human_reason ??
                  conv.needs_human_reason,
                priority: payload.conversation.priority ?? conv.priority,
                ai_summary: payload.ai?.summary ?? conv.ai_summary,
                last_message_at: new Date().toISOString(),
              })
              .eq("id", conv.id)
              .select("*")
              .single();
            if (error) throw error;
            conv = data;
          }

          const { data: message, error: mErr } = await supabase
            .from("messages")
            .insert({
              conversation_id: conv!.id,
              direction: payload.message.direction,
              sender_type: payload.message.sender_type,
              body: payload.message.body ?? null,
              message_type: payload.message.message_type ?? "text",
              audio_url: payload.message.audio_url ?? null,
              transcript: payload.message.transcript ?? null,
              provider_message_id: payload.message.provider_message_id ?? null,
              raw: (payload.message.raw as any) ?? null,
            })
            .select("*")
            .single();
          if (mErr) throw mErr;

          await supabase.from("conversation_events").insert({
            conversation_id: conv!.id,
            event_type: "n8n_inbound_received",
            payload: { meta: payload.meta } as any,
          });
          if (payload.ai?.draft_reply) {
            await supabase.from("conversation_events").insert({
              conversation_id: conv!.id,
              event_type: "ai_draft_generated",
              payload: payload.ai as any,
            });
          }
          if (payload.conversation?.needs_human) {
            await supabase.from("conversation_events").insert({
              conversation_id: conv!.id,
              event_type: "handoff_requested",
              payload: {
                reason:
                  payload.conversation.needs_human_reason ??
                  payload.ai?.reason ??
                  null,
              } as any,
            });
          }

          return json({
            success: true,
            contact_id: contact.id,
            conversation_id: conv!.id,
            message_id: message.id,
          });
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
