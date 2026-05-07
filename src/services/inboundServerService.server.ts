import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { InboundResult, N8nInboundPayload } from "@/types/domain";

export async function handleN8nInboundPayloadAdmin(
  payload: N8nInboundPayload,
): Promise<InboundResult> {
  if (!payload?.contact?.phone) {
    throw new Error("contact.phone required");
  }
  if (!payload?.message?.direction || !payload?.message?.sender_type) {
    throw new Error("message.direction and message.sender_type required");
  }

  const { data: contact, error: contactError } = await supabaseAdmin
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
  if (contactError) throw contactError;

  let { data: conversation, error: conversationLookupError } = await supabaseAdmin
    .from("conversations")
    .select("*")
    .eq("contact_id", contact.id)
    .neq("status", "resolvida")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (conversationLookupError) throw conversationLookupError;

  if (!conversation) {
    const { data, error } = await supabaseAdmin
      .from("conversations")
      .insert({
        contact_id: contact.id,
        status: payload.conversation?.status ?? "nova",
        ai_enabled: payload.conversation?.ai_enabled ?? true,
        needs_human: payload.conversation?.needs_human ?? false,
        needs_human_reason: payload.conversation?.needs_human_reason ?? null,
        priority: payload.conversation?.priority ?? "normal",
        ai_summary: payload.ai?.summary ?? null,
        last_message_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) throw error;
    conversation = data;
  } else if (payload.conversation || payload.ai?.summary) {
    const { data, error } = await supabaseAdmin
      .from("conversations")
      .update({
        status: payload.conversation?.status ?? conversation.status,
        ai_enabled: payload.conversation?.ai_enabled ?? conversation.ai_enabled,
        needs_human: payload.conversation?.needs_human ?? conversation.needs_human,
        needs_human_reason:
          payload.conversation?.needs_human_reason ?? conversation.needs_human_reason,
        priority: payload.conversation?.priority ?? conversation.priority,
        ai_summary: payload.ai?.summary ?? conversation.ai_summary,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversation.id)
      .select("*")
      .single();
    if (error) throw error;
    conversation = data;
  }

  const { data: message, error: messageError } = await supabaseAdmin
    .from("messages")
    .insert({
      conversation_id: conversation.id,
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
  if (messageError) throw messageError;

  await supabaseAdmin.from("conversation_events").insert({
    conversation_id: conversation.id,
    event_type: "n8n_inbound_received",
    payload: { provider_message_id: payload.message.provider_message_id, meta: payload.meta } as any,
  });
  if (payload.ai?.draft_reply) {
    await supabaseAdmin.from("conversation_events").insert({
      conversation_id: conversation.id,
      event_type: "ai_draft_generated",
      payload: payload.ai as any,
    });
  }
  if (payload.conversation?.needs_human) {
    await supabaseAdmin.from("conversation_events").insert({
      conversation_id: conversation.id,
      event_type: "handoff_requested",
      payload: {
        reason: payload.conversation.needs_human_reason ?? payload.ai?.reason ?? null,
      } as any,
    });
  }

  return {
    success: true,
    contact_id: contact.id,
    conversation_id: conversation.id,
    message_id: message.id,
  };
}