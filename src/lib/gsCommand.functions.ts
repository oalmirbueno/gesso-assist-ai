import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Conector seguro Painel GS Gesso ↔ n8n.
 *
 * Único ponto de entrada do painel para comandos sensíveis. Roda no servidor,
 * lê N8N_PANEL_SECRET + URLs do n8n de process.env e nunca devolve segredo
 * para o browser. Quando uma URL ainda não está configurada, o comando é
 * persistido em gs_whatsapp_events (connector_pending) e a UX continua.
 */

const CommandSchema = z.discriminatedUnion("command", [
  z.object({
    command: z.literal("pause_ai"),
    conversation_id: z.string().uuid(),
    reason: z.string().max(120).optional(),
  }),
  z.object({
    command: z.literal("resume_ai"),
    conversation_id: z.string().uuid(),
  }),
  z.object({
    command: z.literal("request_ai_draft"),
    conversation_id: z.string().uuid(),
  }),
  z.object({
    command: z.literal("send_human_message"),
    conversation_id: z.string().uuid(),
    body: z.string().trim().min(1).max(4000),
  }),
  z.object({
    command: z.literal("mark_resolved"),
    conversation_id: z.string().uuid(),
  }),
  z.object({
    command: z.literal("change_seller"),
    conversation_id: z.string().uuid(),
    seller_key: z.string().min(1).max(60),
  }),
]);

type CommandResult = {
  ok: boolean;
  command: string;
  pending_connector?: boolean;
  message_id?: string;
  draft?: string | null;
  delivery_status?: "pending" | "sent" | "failed";
  error?: string;
};

export const gsPanelCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CommandSchema.parse(input))
  .handler(async ({ data, context }): Promise<CommandResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const secret = process.env.N8N_PANEL_SECRET;
    const URLS = {
      ai_control: process.env.N8N_AI_CONTROL_URL,
      human_outbound: process.env.N8N_HUMAN_OUTBOUND_URL,
      request_draft: process.env.N8N_REQUEST_DRAFT_URL ?? process.env.N8N_AI_CONTROL_URL,
    };

    async function logEvent(
      event_type: string,
      payload: Record<string, unknown> = {},
      conversation_id?: string,
    ) {
      await supabaseAdmin.from("gs_whatsapp_events").insert({
        conversation_id: conversation_id ?? (data as any).conversation_id ?? null,
        event_type,
        payload: { ...payload, by_user: userId },
      });
    }

    async function callN8n(url: string | undefined, body: unknown) {
      if (!url || !secret) {
        await logEvent("connector_pending", { target: url ?? null, body });
        return { ok: true, pending: true as const };
      }
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-n8n-secret": secret },
          body: JSON.stringify(body),
        });
        const txt = await res.text();
        let parsed: any = null;
        try { parsed = txt ? JSON.parse(txt) : null; } catch { parsed = { raw: txt }; }
        return { ok: res.ok, pending: false as const, status: res.status, body: parsed };
      } catch (e: any) {
        return { ok: false, pending: false as const, error: e?.message ?? "network error" };
      }
    }

    switch (data.command) {
      case "pause_ai": {
        await supabaseAdmin
          .from("gs_whatsapp_conversations")
          .update({
            ai_enabled: false,
            needs_human: false,
            status: "em_atendimento",
            last_ai_action: "paused_by_human",
          })
          .eq("id", data.conversation_id);
        await logEvent("ai_paused", { reason: data.reason ?? "human_assumed" });
        const r = await callN8n(URLS.ai_control, {
          action: "pause_ai",
          conversation_id: data.conversation_id,
          reason: data.reason ?? "human_assumed",
          user_id: userId,
        });
        return { ok: true, command: data.command, pending_connector: r.pending };
      }

      case "resume_ai": {
        await supabaseAdmin
          .from("gs_whatsapp_conversations")
          .update({
            ai_enabled: true,
            status: "aguardando_cliente",
            last_ai_action: "resumed_by_human",
          })
          .eq("id", data.conversation_id);
        await logEvent("ai_resumed");
        const r = await callN8n(URLS.ai_control, {
          action: "resume_ai",
          conversation_id: data.conversation_id,
          user_id: userId,
        });
        return { ok: true, command: data.command, pending_connector: r.pending };
      }

      case "mark_resolved": {
        await supabaseAdmin
          .from("gs_whatsapp_conversations")
          .update({ status: "resolvida", needs_human: false })
          .eq("id", data.conversation_id);
        await logEvent("conversation_resolved");
        return { ok: true, command: data.command };
      }

      case "change_seller": {
        const { data: seller } = await supabaseAdmin
          .from("gs_sellers")
          .select("id, key")
          .eq("key", data.seller_key)
          .maybeSingle();
        if (!seller) return { ok: false, command: data.command, error: "seller_key not found" };
        await supabaseAdmin
          .from("gs_whatsapp_conversations")
          .update({ current_seller_id: seller.id, current_seller_key: seller.key })
          .eq("id", data.conversation_id);
        await logEvent("seller_changed", { seller_key: seller.key });
        return { ok: true, command: data.command };
      }

      case "request_ai_draft": {
        await logEvent("ai_draft_requested");
        const { data: msgs } = await supabaseAdmin
          .from("gs_whatsapp_messages")
          .select("direction, sender_type, body, transcript, created_at")
          .eq("conversation_id", data.conversation_id)
          .order("created_at", { ascending: false })
          .limit(20);
        const r = await callN8n(URLS.request_draft, {
          action: "request_ai_draft",
          conversation_id: data.conversation_id,
          user_id: userId,
          recent_messages: (msgs ?? []).reverse(),
        });
        if (r.pending) {
          return { ok: true, command: data.command, pending_connector: true, draft: null };
        }
        const draft: string | null =
          r.body?.draft ?? r.body?.reply ?? r.body?.ai_draft_reply ?? null;
        if (draft) {
          await supabaseAdmin
            .from("gs_whatsapp_conversations")
            .update({ ai_draft_reply: draft, last_ai_action: "draft_generated" })
            .eq("id", data.conversation_id);
          await logEvent("ai_draft_generated", { draft });
        }
        return { ok: r.ok, command: data.command, draft };
      }

      case "send_human_message": {
        const { data: conv } = await supabaseAdmin
          .from("gs_whatsapp_conversations")
          .select("id, contact_id, gs_whatsapp_contacts(phone, name)")
          .eq("id", data.conversation_id)
          .maybeSingle();
        if (!conv) return { ok: false, command: data.command, error: "conversation not found" };
        const contact: any = (conv as any).gs_whatsapp_contacts;

        const { data: inserted, error: insErr } = await supabaseAdmin
          .from("gs_whatsapp_messages")
          .insert({
            conversation_id: data.conversation_id,
            direction: "outbound",
            sender_type: "human",
            message_type: "text",
            body: data.body,
            provider_status: "pending",
          })
          .select("id")
          .single();
        if (insErr || !inserted) {
          return { ok: false, command: data.command, error: insErr?.message ?? "insert failed" };
        }

        await supabaseAdmin
          .from("gs_whatsapp_conversations")
          .update({
            ai_enabled: false,
            status: "em_atendimento",
            last_message_at: new Date().toISOString(),
          })
          .eq("id", data.conversation_id);
        await logEvent("human_message_requested", { message_id: inserted.id, body: data.body });

        const r = await callN8n(URLS.human_outbound, {
          action: "send_human_message",
          conversation_id: data.conversation_id,
          message_id: inserted.id,
          contact_phone: contact?.phone ?? null,
          contact_name: contact?.name ?? null,
          body: data.body,
          user_id: userId,
        });

        if (r.pending) {
          return {
            ok: true,
            command: data.command,
            pending_connector: true,
            message_id: inserted.id,
            delivery_status: "pending",
          };
        }
        if (r.ok) {
          await supabaseAdmin
            .from("gs_whatsapp_messages")
            .update({ provider_status: "sent" })
            .eq("id", inserted.id);
          await logEvent("human_message_sent", { message_id: inserted.id });
          return { ok: true, command: data.command, message_id: inserted.id, delivery_status: "sent" };
        }
        await supabaseAdmin
          .from("gs_whatsapp_messages")
          .update({ provider_status: "failed" })
          .eq("id", inserted.id);
        await logEvent("human_message_failed", { message_id: inserted.id, error: r.error ?? r.body });
        return {
          ok: false,
          command: data.command,
          message_id: inserted.id,
          delivery_status: "failed",
          error: r.error ?? "n8n rejected",
        };
      }
    }
  });
