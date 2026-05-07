import { supabase } from "@/integrations/supabase/client";
import type {
  Contact,
  Conversation,
  ConversationEvent,
  InboundResult,
  Message,
  N8nInboundPayload,
} from "@/types/domain";

/**
 * Upsert (insert or update) a contact by phone number.
 * Phone is the unique key. Updates name/stage/tags/etc if already exists.
 */
export async function upsertContact(
  input: N8nInboundPayload["contact"],
): Promise<Contact> {
  if (!input?.phone) throw new Error("Contact phone is required");

  const payload = {
    phone: input.phone,
    name: input.name ?? null,
    source: input.source ?? "whatsapp_cloud_api",
    stage: input.stage ?? "novo",
    tags: input.tags ?? [],
    city: input.city ?? null,
    neighborhood: input.neighborhood ?? null,
    customer_type: input.customer_type ?? null,
  };

  const { data, error } = await supabase
    .from("contacts")
    .upsert(payload, { onConflict: "phone" })
    .select("*")
    .single();

  if (error) throw error;
  return data as Contact;
}

/**
 * Get most recent open conversation for a contact, or null.
 * "Open" = status not 'resolvida'.
 */
export async function getOpenConversation(
  contactId: string,
): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("contact_id", contactId)
    .neq("status", "resolvida")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as Conversation | null) ?? null;
}

/**
 * Get an open conversation or create a new one for the given contact.
 */
export async function getOrCreateOpenConversation(
  contactId: string,
  defaults?: Partial<Conversation>,
): Promise<Conversation> {
  const existing = await getOpenConversation(contactId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      contact_id: contactId,
      status: defaults?.status ?? "nova",
      ai_enabled: defaults?.ai_enabled ?? true,
      needs_human: defaults?.needs_human ?? false,
      priority: defaults?.priority ?? "normal",
      last_message_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Conversation;
}

/**
 * Update an existing conversation with status / flags coming from n8n.
 */
export async function updateConversation(
  conversationId: string,
  patch: Partial<Conversation>,
): Promise<Conversation> {
  const { data, error } = await supabase
    .from("conversations")
    .update({ ...(patch as any), last_message_at: new Date().toISOString() })
    .eq("id", conversationId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Conversation;
}

/**
 * Insert a message into a conversation.
 */
export async function insertMessage(
  conversationId: string,
  msg: N8nInboundPayload["message"],
): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      direction: msg.direction,
      sender_type: msg.sender_type,
      body: msg.body ?? null,
      message_type: msg.message_type ?? "text",
      audio_url: msg.audio_url ?? null,
      transcript: msg.transcript ?? null,
      provider_message_id: msg.provider_message_id ?? null,
      raw: (msg.raw as any) ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Message;
}

/**
 * Insert a conversation event for auditing/automation.
 */
export async function insertConversationEvent(
  conversationId: string,
  eventType: string,
  payload?: Record<string, unknown>,
): Promise<ConversationEvent> {
  const { data, error } = await supabase
    .from("conversation_events")
    .insert({
      conversation_id: conversationId,
      event_type: eventType,
      payload: (payload as any) ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as ConversationEvent;
}

/**
 * Main entry point — handle a payload coming from n8n.
 * Persists contact, conversation, message and emits events.
 *
 * Steps:
 *  1. validate phone
 *  2. upsert contact
 *  3. get/create open conversation
 *  4. update conversation with status flags from payload
 *  5. insert inbound message
 *  6. log 'n8n_inbound_received'
 *  7. if ai.draft_reply -> log 'ai_draft_generated'
 *  8. if conversation.needs_human -> log 'handoff_requested'
 */
export async function handleN8nInboundPayload(
  payload: N8nInboundPayload,
): Promise<InboundResult> {
  if (!payload?.contact?.phone) {
    throw new Error("payload.contact.phone is required");
  }
  if (!payload?.message?.direction || !payload?.message?.sender_type) {
    throw new Error("payload.message.direction and sender_type are required");
  }

  const contact = await upsertContact(payload.contact);
  let conversation = await getOrCreateOpenConversation(contact.id, {
    status: payload.conversation?.status ?? "nova",
    ai_enabled: payload.conversation?.ai_enabled ?? true,
    needs_human: payload.conversation?.needs_human ?? false,
    priority: payload.conversation?.priority ?? "normal",
  });

  // Update with latest payload status / flags
  if (payload.conversation) {
    conversation = await updateConversation(conversation.id, {
      status: payload.conversation.status ?? conversation.status,
      ai_enabled:
        payload.conversation.ai_enabled ?? conversation.ai_enabled,
      needs_human:
        payload.conversation.needs_human ?? conversation.needs_human,
      needs_human_reason:
        payload.conversation.needs_human_reason ??
        conversation.needs_human_reason,
      priority: payload.conversation.priority ?? conversation.priority,
      ai_summary: payload.ai?.summary ?? conversation.ai_summary,
    });
  }

  const message = await insertMessage(conversation.id, payload.message);

  await insertConversationEvent(conversation.id, "n8n_inbound_received", {
    provider_message_id: payload.message.provider_message_id,
    meta: payload.meta,
  });

  if (payload.ai?.draft_reply) {
    await insertConversationEvent(conversation.id, "ai_draft_generated", {
      draft_reply: payload.ai.draft_reply,
      mode: payload.ai.mode,
      reason: payload.ai.reason,
    });
  }

  if (payload.conversation?.needs_human) {
    await insertConversationEvent(conversation.id, "handoff_requested", {
      reason:
        payload.conversation.needs_human_reason ??
        payload.ai?.reason ??
        null,
    });
  }

  return {
    success: true,
    contact_id: contact.id,
    conversation_id: conversation.id,
    message_id: message.id,
  };
}
