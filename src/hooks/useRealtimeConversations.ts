import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Real data source for the inbox.
 *
 * Reads from the live gs_whatsapp_* tables (same source the CRM uses), so
 * names/phones/stages stay in sync with what the operator sees in CRM and
 * what n8n writes via the inbound webhook.
 */
export type GsContactRow = {
  id: string;
  phone: string;
  name: string | null;
  display_name: string | null;
  city: string | null;
  neighborhood: string | null;
  interest: string | null;
  stage: string | null;
  tags: any;
  notes: string | null;
  next_action: string | null;
  responsible_user_id?: string | null;
};

export type GsConversationRow = {
  id: string;
  contact_id: string;
  status: string;
  ai_enabled: boolean;
  needs_human: boolean;
  needs_human_reason: string | null;
  assigned_user_id: string | null;
  last_message_at: string | null;
  unread_count: number | null;
  intent: string | null;
  funnel_stage: string | null;
  ai_confidence: number | null;
  ai_draft_reply: string | null;
  last_ai_action: string | null;
  summary: string | null;
  // legacy/derived fields mapped for inbox UI compatibility
  priority?: string | null;
  ai_summary?: string | null;
  contact?: GsContactRow | null;
};

export type GsMessageRow = {
  id: string;
  conversation_id: string;
  direction: string;
  sender_type: string;
  body: string | null;
  message_type: string;
  audio_url: string | null;
  transcript: string | null;
  created_at: string;
};

export function useRealtimeConversations() {
  const [data, setData] = useState<GsConversationRow[] | null>(null);

  async function load() {
    const { data: convs, error } = await supabase
      .from("gs_whatsapp_conversations")
      .select("*, contact:gs_whatsapp_contacts(*)")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) {
      console.error("load gs conversations failed:", error);
      setData([]);
      return;
    }
    const mapped = (convs ?? []).map((c: any) => ({
      ...c,
      priority: c.priority ?? "media",
      ai_summary: c.summary ?? "",
    })) as GsConversationRow[];
    setData(mapped);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("gs-inbox-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gs_whatsapp_conversations" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gs_whatsapp_contacts" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "gs_whatsapp_messages" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return data;
}

export function useRealtimeMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<GsMessageRow[]>([]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    let active = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("gs_whatsapp_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) console.error(error);
      if (active) setMessages((data ?? []) as GsMessageRow[]);
    };
    load();

    const channel = supabase
      .channel(`gs-messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gs_whatsapp_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((m) => [...m, payload.new as GsMessageRow]);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return messages;
}

// Backwards-compat alias for older imports.
export type ConversationWithContact = GsConversationRow;
