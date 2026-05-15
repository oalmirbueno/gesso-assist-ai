import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { InboundResult, N8nInboundPayload } from "@/types/domain";

/**
 * Writes inbound n8n payloads into the GS Gesso schema (gs_whatsapp_*).
 * RLS is bypassed because we use the service-role client.
 */
export async function handleN8nInboundPayloadAdmin(
  payload: N8nInboundPayload,
): Promise<InboundResult> {
  if (!payload?.contact) throw new Error("contact required");
  if (!payload?.message?.direction || !payload?.message?.sender_type) {
    throw new Error("message.direction and message.sender_type required");
  }
  if (payload.event_type === "evolution_history_backfill" && !payload.message.provider_message_id) {
    throw new Error("message.provider_message_id required for evolution_history_backfill");
  }

  const nowIso = new Date().toISOString();
  const messageCreatedAt = payload.message.created_at ?? nowIso;
  const provider = (payload.meta as any)?.provider ?? "evolution";
  const providerInstance =
    (payload.meta as any)?.provider_instance ??
    (payload.meta as any)?.instance ??
    "gs-gesso";
  const remoteJid =
    payload.conversation?.remote_jid ??
    payload.conversation?.external_id ??
    (payload.meta as any)?.remote_jid ??
    (payload.meta as any)?.jid ??
    (payload.message.raw as any)?.remote_jid ??
    (payload.message.raw as any)?.key?.remoteJid ??
    (payload.contact.phone ? `${payload.contact.phone}@s.whatsapp.net` : null);
  if (!remoteJid) throw new Error("conversation.remote_jid or contact.phone required");
  const digits = (value: string | null | undefined) => (value ?? "").replace(/\D/g, "");
  const fallbackPhone = digits(remoteJid);
  const phone = digits(payload.contact.phone) || fallbackPhone;
  if (!phone) throw new Error("phone or digits(remote_jid) required");
  const lidJid = remoteJid.endsWith("@lid")
    ? remoteJid
    : ((payload.meta as any)?.lid_jid ?? (payload.contact as any).lid ?? (payload.message.raw as any)?.lid_jid ?? null);
  const displayName =
    payload.contact.display_name ??
    payload.contact.pushName ??
    payload.contact.push_name ??
    payload.contact.name ??
    (payload.meta as any)?.pushName ??
    (payload.meta as any)?.push_name ??
    null;
  const contactRaw = {
    ...(payload.contact as any),
    remote_jid: remoteJid,
    lid_jid: lidJid,
    pushName: displayName,
  };

  // 1) Conversation lookup by operational key before deciding which contact to update.
  const { data: byJid, error: byJidErr } = await supabaseAdmin
    .from("gs_whatsapp_conversations")
    .select("*")
    .eq("provider_instance", providerInstance)
    .eq("remote_jid", remoteJid)
    .maybeSingle();
  if (byJidErr) throw byJidErr;

  let contact: any = null;
  if (byJid?.contact_id) {
    const { data: existingContact, error } = await supabaseAdmin
      .from("gs_whatsapp_contacts")
      .select("*")
      .eq("id", byJid.contact_id)
      .maybeSingle();
    if (error) throw error;
    contact = existingContact;
  }

  if (!contact) {
    const { data, error } = await supabaseAdmin
      .from("gs_whatsapp_contacts")
      .upsert(
        {
          phone,
          name: payload.contact.name ?? displayName,
          display_name: displayName,
          source: payload.contact.source ?? "whatsapp_evolution",
          stage: payload.contact.stage ?? "novo",
          tags: (payload.contact.tags as any) ?? [],
          city: payload.contact.city ?? null,
          neighborhood: payload.contact.neighborhood ?? null,
          last_message_at: messageCreatedAt,
          raw: contactRaw as any,
        },
        { onConflict: "phone" },
      )
      .select("*")
      .single();
    if (error) throw error;
    contact = data;
  } else {
    const patch = {
      phone,
      name: payload.contact.name ?? contact.name ?? displayName,
      display_name: displayName ?? contact.display_name,
      source: payload.contact.source ?? contact.source,
      stage: payload.contact.stage ?? contact.stage,
      tags: (payload.contact.tags as any) ?? contact.tags,
      city: payload.contact.city ?? contact.city,
      neighborhood: payload.contact.neighborhood ?? contact.neighborhood,
      last_message_at: messageCreatedAt,
      raw: { ...(contact.raw ?? {}), ...contactRaw } as any,
    };
    const { data, error } = await supabaseAdmin
      .from("gs_whatsapp_contacts")
      .update(patch)
      .eq("id", contact.id)
      .select("*")
      .single();
    if (error?.code === "23505") {
      const { data: phoneContact, error: phoneErr } = await supabaseAdmin
        .from("gs_whatsapp_contacts")
        .select("*")
        .eq("phone", phone)
        .maybeSingle();
      if (phoneErr) throw phoneErr;
      if (phoneContact) contact = phoneContact;
    } else if (error) throw error;
    else contact = data;
  }

  // 2) Conversation: operational identity is provider_instance + remote_jid.
  const existing = byJid;

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
        last_message_at: messageCreatedAt,
        last_inbound_at: isInbound ? messageCreatedAt : null,
        last_outbound_at: !isInbound ? messageCreatedAt : null,
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
        contact_id: contact.id,
        status: payload.conversation?.status ?? conversation.status,
        ai_enabled:
          payload.conversation?.ai_enabled ?? conversation.ai_enabled,
        needs_human:
          payload.conversation?.needs_human ?? conversation.needs_human,
        needs_human_reason:
          payload.conversation?.needs_human_reason ??
          (payload.ai as any)?.handoff_reason ??
          conversation.needs_human_reason,
        last_message_at: messageCreatedAt,
        last_inbound_at: isInbound ? messageCreatedAt : conversation.last_inbound_at,
        last_outbound_at: !isInbound ? messageCreatedAt : conversation.last_outbound_at,
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
    raw: { ...((payload.message.raw as any) ?? {}), remote_jid: remoteJid, lid_jid: lidJid },
    created_at: messageCreatedAt,
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
      event_type: payload.event_type ?? "n8n_inbound_received",
      payload: {
        provider_message_id: payload.message.provider_message_id,
        remote_jid: remoteJid,
        lid_jid: lidJid,
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
