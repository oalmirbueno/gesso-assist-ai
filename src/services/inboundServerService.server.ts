import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { InboundResult, N8nInboundPayload } from "@/types/domain";

function digits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function readBody(rawMessage: any) {
  return (
    rawMessage?.body ??
    rawMessage?.message?.conversation ??
    rawMessage?.message?.extendedTextMessage?.text ??
    rawMessage?.message?.imageMessage?.caption ??
    rawMessage?.message?.videoMessage?.caption ??
    rawMessage?.text ??
    null
  );
}

function readTranscript(message: any, raw: any, media: any) {
  return (
    message?.transcript ??
    message?.transcription ??
    message?.audio?.transcript ??
    message?.audio?.transcription ??
    media?.transcript ??
    media?.transcription ??
    raw?.transcript ??
    raw?.transcription ??
    raw?.message?.transcript ??
    raw?.message?.transcription ??
    raw?.audio?.transcript ??
    raw?.audio?.transcription ??
    raw?.message?.audioMessage?.transcript ??
    raw?.message?.audioMessage?.transcription ??
    null
  );
}

function hasText(value: unknown) {
  return String(value ?? "").trim().length > 0;
}

function isLidJid(value: unknown) {
  return String(value ?? "").endsWith("@lid");
}

function isClientWhatsappJid(value: unknown) {
  return String(value ?? "").endsWith("@s.whatsapp.net");
}

function normalizeMessageParts(message: any) {
  const candidates =
    message?.parts ??
    message?.message_parts ??
    message?.body_parts ??
    message?.chunks ??
    message?.messages ??
    null;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  return candidates
    .map((part: any) => (typeof part === "string" ? { body: part } : part))
    .filter((part: any) => part && String(part.body ?? part.text ?? "").trim());
}

function withUniquePartProviderId(base: string | null | undefined, index: number, total: number) {
  if (!base) return null;
  return total > 1 ? `${base}_${index + 1}` : base;
}

export function expandInboundPayloadBatch(rawPayload: any): N8nInboundPayload[] {
  if (Array.isArray(rawPayload)) return rawPayload as N8nInboundPayload[];
  const messages =
    rawPayload?.messages ??
    rawPayload?.message_parts ??
    rawPayload?.data?.messages ??
    rawPayload?.data?.messages?.records ??
    null;
  if (!Array.isArray(messages)) return [rawPayload as N8nInboundPayload];
  return messages.map((message: any) => ({
    ...rawPayload,
    contact: message.contact ?? rawPayload.contact,
    conversation: message.conversation ?? rawPayload.conversation,
    message: { ...(typeof message === "string" ? { body: message } : message) },
    meta: { ...(rawPayload.meta ?? {}), ...(message.meta ?? {}) },
  })) as N8nInboundPayload[];
}

function normalizeInboundPayload(rawPayload: any): N8nInboundPayload {
  const data = rawPayload?.data ?? rawPayload?.message?.raw?.data ?? {};
  const key = data?.key ?? rawPayload?.key ?? rawPayload?.message?.raw?.key ?? {};
  const rawMessage = rawPayload?.message ?? data;
  const remoteJid =
    rawPayload?.conversation?.remote_jid ??
    rawPayload?.conversation?.external_id ??
    rawPayload?.message?.remote_jid ??
    rawPayload?.message?.remoteJid ??
    rawPayload?.remote_jid ??
    rawPayload?.remoteJid ??
    rawPayload?.jid ??
    rawPayload?.meta?.remote_jid ??
    rawPayload?.meta?.jid ??
    rawPayload?.message?.raw?.remote_jid ??
    rawPayload?.message?.raw?.remoteJid ??
    rawPayload?.message?.raw?.key?.remoteJidAlt ??
    rawPayload?.message?.key?.remoteJid ??
    rawMessage?.raw?.remote_jid ??
    rawMessage?.raw?.remoteJid ??
    rawMessage?.raw?.key?.remoteJidAlt ??
    rawMessage?.raw?.key?.remoteJid ??
    key?.remoteJidAlt ??
    data?.remoteJid ??
    key?.remoteJid ??
    null;
  const fromMe = Boolean(key?.fromMe ?? data?.fromMe ?? rawPayload?.fromMe);
  // IMPORTANTE: a conversa é sempre identificada pelo CLIENTE (remoteJid),
  // mesmo quando fromMe=true (resposta da IA/automação). Nunca usar data.sender
  // como phone quando fromMe, pois sender = número do bot e geraria contato separado.
  const remoteJidDigits =
    remoteJid && !String(remoteJid).endsWith("@lid") ? digits(remoteJid) : undefined;
  const phone =
    rawPayload?.contact?.phone ??
    rawPayload?.phone ??
    rawPayload?.contact_phone ??
    remoteJidDigits ??
    (fromMe ? undefined : data?.sender);
  // Quando fromMe=true, pushName costuma ser "Você" (perspectiva do bot).
  // Esses nomes não devem virar nome do contato.
  const rawPushName =
    rawPayload?.contact?.pushName ??
    rawPayload?.contact?.push_name ??
    rawPayload?.contact?.display_name ??
    rawPayload?.contact?.name ??
    rawPayload?.pushName ??
    rawPayload?.message?.pushName ??
    rawPayload?.message?.push_name ??
    data?.pushName ??
    null;
  const isSelfReferenceName = (n: any) =>
    typeof n === "string" && /^(voc[eê]|you|me|eu)$/i.test(n.trim());
  const pushName = fromMe && isSelfReferenceName(rawPushName) ? null : rawPushName;
  const timestamp =
    rawPayload?.message?.created_at ?? data?.messageTimestamp ?? rawPayload?.messageTimestamp;
  const createdAt =
    typeof timestamp === "number"
      ? new Date(timestamp > 9999999999 ? timestamp : timestamp * 1000).toISOString()
      : timestamp;

  return {
    ...rawPayload,
    event_type: rawPayload?.event_type ?? rawPayload?.event ?? "n8n_inbound_received",
    contact: {
      ...(rawPayload?.contact ?? {}),
      phone,
      name: rawPayload?.contact?.name ?? pushName ?? undefined,
      display_name: rawPayload?.contact?.display_name ?? pushName ?? undefined,
      pushName: rawPayload?.contact?.pushName ?? pushName ?? undefined,
      lid:
        rawPayload?.contact?.lid ??
        (String(remoteJid ?? "").endsWith("@lid") ? remoteJid : undefined),
    },
    conversation: {
      ...(rawPayload?.conversation ?? {}),
      remote_jid: remoteJid ?? rawPayload?.conversation?.remote_jid,
      external_id: rawPayload?.conversation?.external_id ?? remoteJid ?? undefined,
    },
    message: {
      ...(rawPayload?.message ?? {}),
      direction: rawPayload?.message?.direction ?? (fromMe ? "outbound" : "inbound"),
      sender_type: rawPayload?.message?.sender_type ?? (fromMe ? "human" : "client"),
      body: rawPayload?.message?.body ?? readBody(rawMessage),
      transcript: readTranscript(
        rawPayload?.message,
        rawPayload?.message?.raw ?? data,
        rawPayload?.message?.media,
      ),
      message_type: rawPayload?.message?.message_type ?? (data?.messageType || "text"),
      provider_message_id:
        rawPayload?.message?.provider_message_id ?? key?.id ?? data?.id ?? undefined,
      created_at: createdAt ?? rawPayload?.message?.created_at,
      raw: { ...(rawPayload?.message?.raw ?? {}), ...data, remote_jid: remoteJid, key },
    },
    meta: {
      ...(rawPayload?.meta ?? {}),
      provider: rawPayload?.meta?.provider ?? "evolution",
      instance: rawPayload?.meta?.instance ?? rawPayload?.instance ?? data?.instanceId,
      remote_jid: rawPayload?.meta?.remote_jid ?? remoteJid,
    },
  } as N8nInboundPayload;
}

/**
 * Writes inbound n8n payloads into the GS Gesso schema (gs_whatsapp_*).
 * RLS is bypassed because we use the service-role client.
 */
export async function handleN8nInboundPayloadAdmin(
  rawPayload: N8nInboundPayload,
): Promise<InboundResult> {
  const payload = normalizeInboundPayload(rawPayload);
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
    (payload.meta as any)?.provider_instance ?? (payload.meta as any)?.instance ?? "gs-gesso";
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
  const rawRemoteJid =
    (payload.message.raw as any)?.key?.remoteJid ?? (payload.message.raw as any)?.remoteJid ?? null;
  const remoteJidAlt =
    (payload.message.raw as any)?.key?.remoteJidAlt ??
    (payload.message.raw as any)?.remoteJidAlt ??
    (payload.meta as any)?.remote_jid_alt ??
    null;
  const preferredPhoneJid = isClientWhatsappJid(remoteJid)
    ? remoteJid
    : isClientWhatsappJid(remoteJidAlt)
      ? remoteJidAlt
      : isClientWhatsappJid(rawRemoteJid)
        ? rawRemoteJid
        : null;
  const fallbackPhone = digits(preferredPhoneJid ?? remoteJid);
  const phone = digits(payload.contact.phone) || fallbackPhone;
  if (!phone) throw new Error("phone or digits(remote_jid) required");
  const lidJid = isLidJid(remoteJid)
    ? remoteJid
    : isLidJid(rawRemoteJid)
      ? rawRemoteJid
      : ((payload.meta as any)?.lid_jid ??
        (payload.contact as any).lid ??
        (payload.message.raw as any)?.lid_jid ??
        null);
  const canonicalRemoteJid = preferredPhoneJid ?? remoteJid;
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
          remote_jid: canonicalRemoteJid,
    lid_jid: lidJid,
    pushName: displayName,
  };
  const contactContext = {
    interest:
      (payload.contact as any).interest ?? (payload.ai as any)?.collected_fields?.interest ?? null,
    notes: (payload.contact as any).notes ?? (payload.ai as any)?.notes ?? null,
    next_action: (payload.contact as any).next_action ?? (payload.ai as any)?.next_action ?? null,
  };

  // 1) Conversation lookup by operational key before deciding which contact to update.
  const { data: byJidRow, error: byJidErr } = await supabaseAdmin
    .from("gs_whatsapp_conversations")
    .select("*")
    .eq("provider_instance", providerInstance)
    .eq("remote_jid", remoteJid)
    .maybeSingle();
  if (byJidErr) throw byJidErr;
  let byJid = byJidRow;
  if (!byJid && lidJid && lidJid !== remoteJid) {
    const { data: byLid, error } = await supabaseAdmin
      .from("gs_whatsapp_conversations")
      .select("*")
      .eq("provider_instance", providerInstance)
      .eq("remote_jid", lidJid)
      .maybeSingle();
    if (error) throw error;
    byJid = byLid;
  }
  if (!byJid && !isClientWhatsappJid(remoteJid) && preferredPhoneJid) {
    const { data: byPreferredJid, error } = await supabaseAdmin
      .from("gs_whatsapp_conversations")
      .select("*")
      .eq("provider_instance", providerInstance)
      .eq("remote_jid", preferredPhoneJid)
      .maybeSingle();
    if (error) throw error;
    byJid = byPreferredJid;
  }
  if (!byJid) {
    const { data: byRawLid, error } = await supabaseAdmin
      .from("gs_whatsapp_conversations")
      .select("*")
      .eq("provider_instance", providerInstance)
      .filter("raw->>lid_jid", "eq", remoteJid)
      .maybeSingle();
    if (error) throw error;
    byJid = byRawLid;
  }
  // Fallback por TELEFONE: a mesma pessoa pode chegar com remote_jid diferentes
  // (ex: inbound como @lid, outbound como @s.whatsapp.net). Procura contato pelo
  // phone e reusa a conversa mais recente dele para não duplicar.
  let matchedByPhoneFallback = false;
  if (!byJid && phone) {
    const { data: phoneContacts } = await supabaseAdmin
      .from("gs_whatsapp_contacts")
      .select("id, raw")
      .or(`phone.eq.${phone},raw->phone_aliases.cs.["${phone}"]`);
    const candidateIds = (phoneContacts ?? []).map((c: any) => c.id);
    if (candidateIds.length > 0) {
      const { data: convByPhone } = await supabaseAdmin
        .from("gs_whatsapp_conversations")
        .select("*")
        .eq("provider_instance", providerInstance)
        .in("contact_id", candidateIds)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (convByPhone) {
        byJid = convByPhone;
        matchedByPhoneFallback = true;
      }
    }
  }

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
          interest: contactContext.interest,
          notes: contactContext.notes,
          next_action: contactContext.next_action,
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
    const existingAliases: string[] = Array.isArray(contact.raw?.phone_aliases)
      ? contact.raw.phone_aliases
      : [];
    const aliasSet = new Set(existingAliases);
    if (matchedByPhoneFallback && phone && phone !== contact.phone) aliasSet.add(phone);
    const patch: any = {
      // Em phone fallback NÃO sobrescreve phone (jids @lid vs @s.whatsapp.net geram phones diferentes do mesmo cliente)
      phone: matchedByPhoneFallback ? contact.phone : phone || contact.phone,
      name: payload.contact.name ?? contact.name ?? displayName,
      display_name: displayName ?? contact.display_name,
      source: payload.contact.source ?? contact.source,
      stage: payload.contact.stage ?? contact.stage,
      tags: (payload.contact.tags as any) ?? contact.tags,
      city: payload.contact.city ?? contact.city,
      neighborhood: payload.contact.neighborhood ?? contact.neighborhood,
      interest: contactContext.interest ?? contact.interest,
      notes: contactContext.notes ?? contact.notes,
      next_action: contactContext.next_action ?? contact.next_action,
      last_message_at: messageCreatedAt,
      raw: { ...(contact.raw ?? {}), ...contactRaw, phone_aliases: Array.from(aliasSet) } as any,
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
    ai_confidence: typeof payload.ai?.confidence === "number" ? payload.ai.confidence : null,
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
          payload.conversation?.needs_human_reason ?? (payload.ai as any)?.handoff_reason ?? null,
        last_message_at: messageCreatedAt,
        last_inbound_at: isInbound ? messageCreatedAt : null,
        last_outbound_at: !isInbound ? messageCreatedAt : null,
        summary: (payload.ai as any)?.summary ?? null,
        raw: { ...(payload as any), remote_jid: canonicalRemoteJid, lid_jid: lidJid } as any,
        ...aiFields,
      })
      .select("*")
      .single();
    if (error) throw error;
    conversation = data;
  } else {
    // Em phone fallback, preserva o remote_jid original da conversa e registra o jid alterno em raw.jid_aliases.
    const existingJidAliases: string[] = Array.isArray((conversation.raw as any)?.jid_aliases)
      ? (conversation.raw as any).jid_aliases
      : [];
    const jidAliasSet = new Set(existingJidAliases);
    if (matchedByPhoneFallback && remoteJid && remoteJid !== conversation.remote_jid)
      jidAliasSet.add(remoteJid);
    const effectiveRemoteJid = matchedByPhoneFallback
      ? conversation.remote_jid
      : canonicalRemoteJid;
    const { data, error } = await supabaseAdmin
      .from("gs_whatsapp_conversations")
      .update({
        contact_id: contact.id,
        provider_instance: providerInstance,
        remote_jid: effectiveRemoteJid,
        status: payload.conversation?.status ?? conversation.status,
        ai_enabled: payload.conversation?.ai_enabled ?? conversation.ai_enabled,
        needs_human: payload.conversation?.needs_human ?? conversation.needs_human,
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
        ai_last_decision: aiFields.ai_last_decision ?? conversation.ai_last_decision,
        ai_draft_reply: aiFields.ai_draft_reply ?? conversation.ai_draft_reply,
        raw: {
          ...((conversation.raw as any) ?? {}),
          ...(payload as any),
          remote_jid: effectiveRemoteJid,
          lid_jid: lidJid ?? (conversation.raw as any)?.lid_jid,
          jid_aliases: Array.from(jidAliasSet),
        } as any,
        unread_count: isInbound ? (conversation.unread_count ?? 0) + 1 : conversation.unread_count,
      })
      .eq("id", conversation.id)
      .select("*")
      .single();
    if (error) throw error;
    conversation = data;
  }

  // 3) Message (idempotent on provider_message_id when present)
  const parts = normalizeMessageParts(payload.message) ?? [{ body: payload.message.body }];
  const insertedMessageIds: string[] = [];
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index] as any;
    const partRaw = { ...((payload.message.raw as any) ?? {}), ...((part.raw as any) ?? {}) };
    const audioMsg = partRaw?.message?.audioMessage ?? partRaw?.audioMessage;
    const partAudio = part.audio ?? (payload.message as any).audio ?? null;
    const mediaCandidate =
      part.media ??
      (payload.message as any).media ??
      partRaw?.media ??
      partAudio ??
      (audioMsg ? { type: "audio", ...audioMsg } : null);
    const audioUrl =
      part.audio_url ??
      payload.message.audio_url ??
      partAudio?.url ??
      partAudio?.audio_url ??
      mediaCandidate?.url ??
      mediaCandidate?.audio_url ??
      audioMsg?.url ??
      partRaw?.audio_url ??
      null;
    const messageType =
      part.message_type ??
      payload.message.message_type ??
      (audioMsg || audioUrl ? "audio" : "text");
    const providerStatus =
      part.provider_status ?? (payload.message as any).provider_status ?? partRaw?.status ?? null;
    const messageRow: any = {
      conversation_id: conversation.id,
      contact_id: contact.id,
      direction: part.direction ?? payload.message.direction,
      sender_type: part.sender_type ?? payload.message.sender_type,
      body: part.body ?? part.text ?? payload.message.body ?? null,
      message_type: messageType,
      audio_url: audioUrl,
      transcript:
        readTranscript(part, partRaw, mediaCandidate) ??
        readTranscript(payload.message, payload.message.raw, (payload.message as any).media) ??
        null,
      media: mediaCandidate ?? {},
      provider_status: providerStatus,
      provider_message_id:
        part.provider_message_id ??
        withUniquePartProviderId(payload.message.provider_message_id, index, parts.length),
      raw: {
        ...partRaw,
        remote_jid: remoteJid,
        lid_jid: lidJid,
        part_index: parts.length > 1 ? index + 1 : undefined,
        part_count: parts.length > 1 ? parts.length : undefined,
      },
      created_at: part.created_at ?? messageCreatedAt,
      intent: part.intent ?? aiFields.intent,
      confidence: part.confidence ?? aiFields.ai_confidence,
      needs_human: payload.conversation?.needs_human ?? null,
      ai_reply: part.ai_reply ?? aiFields.ai_draft_reply,
    };

    // Defensive guard: skip empty payloads (no body, no transcript, no audio, no media).
    // Prevents incomplete backfills from polluting the inbox with "sem texto" rows.
    const hasContent =
      hasText(messageRow.body) ||
      hasText(messageRow.transcript) ||
      Boolean(messageRow.audio_url) ||
      Boolean((messageRow.media as any)?.url);
    if (!hasContent) {
      console.warn("[inbound] skipped empty message payload", {
        provider_message_id: messageRow.provider_message_id,
        remote_jid: remoteJid,
      });
      continue;
    }

    if (messageRow.provider_message_id) {
      const { data: existingMessage, error: existingMessageError } = await supabaseAdmin
        .from("gs_whatsapp_messages")
        .select("id, body, transcript, audio_url, media, raw, conversation_id, contact_id")
        .eq("provider_message_id", messageRow.provider_message_id)
        .maybeSingle();
      if (existingMessageError) throw existingMessageError;
      if (existingMessage) {
        messageRow.body = hasText(messageRow.body) ? messageRow.body : existingMessage.body;
        messageRow.transcript = hasText(messageRow.transcript)
          ? messageRow.transcript
          : existingMessage.transcript;
        messageRow.audio_url = messageRow.audio_url ?? existingMessage.audio_url;
        messageRow.media = {
          ...((existingMessage.media as any) ?? {}),
          ...((messageRow.media as any) ?? {}),
        };
        messageRow.raw = {
          ...((existingMessage.raw as any) ?? {}),
          ...((messageRow.raw as any) ?? {}),
        };
      }
      const { data, error } = await supabaseAdmin
        .from("gs_whatsapp_messages")
        .upsert(messageRow, { onConflict: "provider_message_id" })
        .select("id")
        .single();
      if (error) throw error;
      insertedMessageIds.push(data.id);
    } else {
      const { data, error } = await supabaseAdmin
        .from("gs_whatsapp_messages")
        .insert(messageRow)
        .select("id")
        .single();
      if (error) throw error;
      insertedMessageIds.push(data.id);
    }
  }
  const messageId = insertedMessageIds[0];

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
        reason: payload.conversation.needs_human_reason ?? (payload.ai as any)?.reason ?? null,
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
