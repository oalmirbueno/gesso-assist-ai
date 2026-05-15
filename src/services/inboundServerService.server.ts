import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { InboundResult, N8nInboundPayload } from "@/types/domain";

/**
 * Writes inbound n8n payloads into the GS Gesso schema (gs_whatsapp_*).
 * RLS is bypassed because we use the service-role client.
 */
export async function handleN8nInboundPayloadAdmin(
  payload: N8nInboundPayload,
): Promise<InboundResult> {
  if (!payload?.contact?.phone) throw new Error("contact.phone required");
  if (!payload?.message?.direction || !payload?.message?.sender_type) {
    throw new Error("message.direction and message.sender_type required");
  }

  const nowIso = new Date().toISOString();
  const provider = (payload.meta as any)?.provider ?? "evolution";
  const providerInstance =
    (payload.meta as any)?.provider_instance ??
    (payload.meta as any)?.instance ??
    "gs-gesso";
  const remoteJid =
    (payload.meta as any)?.remote_jid ??
    `${payload.contact.phone}@s.whatsapp.net`;

  // 1) Contact (upsert on phone)
  const { data: contact, error: contactError } = await supabaseAdmin
    .from("gs_whatsapp_contacts")
    .upsert(
      {
        phone: payload.contact.phone,
        name: payload.contact.name ?? null,
        display_name: payload.contact.name ?? null,
        source: payload.contact.source ?? "whatsapp_evolution",
        stage: payload.contact.stage ?? "novo",
        tags: (payload.contact.tags as any) ?? [],
        city: payload.contact.city ?? null,
        neighborhood: payload.contact.neighborhood ?? null,
        last_message_at: nowIso,
        raw: payload.contact as any,
      },
      { onConflict: "phone" },
    )
    .select("*")
    .single();
  if (contactError) throw contactError;

  // 2) Conversation: open one if exists, else create
  const { data: existing, error: lookupErr } = await supabaseAdmin
    .from("gs_whatsapp_conversations")
    .select("*")
    .eq("contact_id", contact.id)
    .neq("status", "resolvida")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lookupErr) throw lookupErr;

  const aiFields = {
    intent: payload.ai?.intent ?? null,
    funnel_stage: payload.ai?.stage ?? null,
    ai_confidence:
      typeof payload.ai?.confidence === "number" ? payload.ai.confidence : null,
    last_ai_action: payload.ai?.last_action ?? payload.ai?.mode ?? null,
    ai_last_decision: (payload.ai?.decision ?? payload.ai ?? null) as any,
    ai_draft_reply: payload.ai?.draft_reply ?? payload.ai?.reply_body ?? null,
  };

  let conversation = existing;
  const isInbound = payload.message.direction === "inbound";

  if (!conversation) {
    const { data, error } = await supabaseAdmin
      .from("gs_whatsapp_conversations")
      .insert({
        contact_id: contact.id,
        provider,
        provider_instance: providerInstance,
        remote_jid: remoteJid,
        status: payload.conversation?.status ?? "nova",
        ai_enabled: payload.conversation?.ai_enabled ?? true,
        needs_human: payload.conversation?.needs_human ?? false,
        needs_human_reason:
          payload.conversation?.needs_human_reason ??
          (payload.ai as any)?.handoff_reason ??
          null,
        last_message_at: nowIso,
        last_inbound_at: isInbound ? nowIso : null,
        last_outbound_at: !isInbound ? nowIso : null,
        summary: (payload.ai as any)?.summary ?? null,
        raw: payload as any,
        ...aiFields,
      })
      .select("*")
      .single();
    if (error) throw error;
    conversation = data;
  } else {
    const { data, error } = await supabaseAdmin
      .from("gs_whatsapp_conversations")
      .update({
        status: payload.conversation?.status ?? conversation.status,
        ai_enabled:
          payload.conversation?.ai_enabled ?? conversation.ai_enabled,
        needs_human:
          payload.conversation?.needs_human ?? conversation.needs_human,
        needs_human_reason:
          payload.conversation?.needs_human_reason ??
          (payload.ai as any)?.handoff_reason ??
          conversation.needs_human_reason,
        last_message_at: nowIso,
        last_inbound_at: isInbound ? nowIso : conversation.last_inbound_at,
        last_outbound_at: !isInbound ? nowIso : conversation.last_outbound_at,
        summary: (payload.ai as any)?.summary ?? conversation.summary,
        intent: aiFields.intent ?? conversation.intent,
        funnel_stage: aiFields.funnel_stage ?? conversation.funnel_stage,
        ai_confidence: aiFields.ai_confidence ?? conversation.ai_confidence,
        last_ai_action: aiFields.last_ai_action ?? conversation.last_ai_action,
        ai_last_decision:
          aiFields.ai_last_decision ?? conversation.ai_last_decision,
        ai_draft_reply: aiFields.ai_draft_reply ?? conversation.ai_draft_reply,
        unread_count: isInbound
          ? (conversation.unread_count ?? 0) + 1
          : conversation.unread_count,
      })
      .eq("id", conversation.id)
      .select("*")
      .single();
    if (error) throw error;
    conversation = data;
  }

  // 3) Message (idempotent on provider_message_id when present)
  const messageRow: any = {
    conversation_id: conversation.id,
    contact_id: contact.id,
    direction: payload.message.direction,
    sender_type: payload.message.sender_type,
    body: payload.message.body ?? null,
    message_type: payload.message.message_type ?? "text",
    audio_url: payload.message.audio_url ?? null,
    transcript: payload.message.transcript ?? null,
    provider_message_id: payload.message.provider_message_id ?? null,
    raw: (payload.message.raw as any) ?? null,
    intent: aiFields.intent,
    confidence: aiFields.ai_confidence,
    needs_human: payload.conversation?.needs_human ?? null,
    ai_reply: aiFields.ai_draft_reply,
  };

  let messageId: string;
  if (payload.message.provider_message_id) {
    const { data, error } = await supabaseAdmin
      .from("gs_whatsapp_messages")
      .upsert(messageRow, { onConflict: "provider_message_id" })
      .select("id")
      .single();
    if (error) throw error;
    messageId = data.id;
  } else {
    const { data, error } = await supabaseAdmin
      .from("gs_whatsapp_messages")
      .insert(messageRow)
      .select("id")
      .single();
    if (error) throw error;
    messageId = data.id;
  }

  // 4) Events
  const events: Array<{ event_type: string; payload: any }> = [
    {
      event_type: "n8n_inbound_received",
      payload: {
        provider_message_id: payload.message.provider_message_id,
        meta: payload.meta,
      },
    },
  ];
  if (payload.ai?.draft_reply) {
    events.push({ event_type: "ai_draft_generated", payload: payload.ai });
  }
  if (payload.conversation?.needs_human) {
    events.push({
      event_type: "handoff_requested",
      payload: {
        reason:
          payload.conversation.needs_human_reason ??
          (payload.ai as any)?.reason ??
          null,
      },
    });
  }

  await supabaseAdmin.from("gs_whatsapp_events").insert(
    events.map((e) => ({
      conversation_id: conversation.id,
      contact_id: contact.id,
      event_type: e.event_type,
      payload: e.payload,
    })),
  );

  return {
    success: true,
    contact_id: contact.id,
    conversation_id: conversation.id,
    message_id: messageId,
  };
}
