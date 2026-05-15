import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GsContact {
  id: string;
  phone: string;
  name: string | null;
  display_name: string | null;
  city: string | null;
  neighborhood: string | null;
  interest: string | null;
  stage: string;
  responsible_seller_id: string | null;
  next_action: string | null;
  notes: string | null;
  tags: any;
  raw?: any;
}

export interface GsConversation {
  id: string;
  contact_id: string;
  status: string;
  ai_enabled: boolean;
  needs_human: boolean;
  needs_human_reason: string | null;
  current_seller_id: string | null;
  intent: string | null;
  funnel_stage: string | null;
  ai_confidence: number | null;
  last_ai_action: string | null;
  ai_draft_reply: string | null;
  unread_count: number;
  last_message_at: string | null;
  provider_instance: string | null;
  remote_jid: string | null;
  summary: string | null;
  ai_last_decision: Record<string, unknown> | null;
  raw?: any;
  contact?: GsContact;
}

export interface GsMessage {
  id: string;
  conversation_id: string;
  provider_message_id: string | null;
  direction: string;
  sender_type: string;
  message_type: string;
  body: string | null;
  audio_url: string | null;
  transcript: string | null;
  intent: string | null;
  ai_reply: string | null;
  media: any;
  provider_status: string | null;
  raw?: any;
  confidence: number | null;
  created_at: string;
}

export function jidLocalId(remoteJid?: string | null) {
  return String(remoteJid ?? "").split("@")[0] || null;
}

export function getGsConversationDisplayName(conversation: Pick<GsConversation, "remote_jid" | "contact">): string {
  const contact = conversation.contact;
  return String(
    contact?.display_name ||
    contact?.raw?.pushName ||
    contact?.raw?.push_name ||
    contact?.name ||
    jidLocalId(conversation.remote_jid) ||
    contact?.phone ||
    "Sem nome"
  );
}

export interface GsSeller {
  id: string;
  key: string;
  name: string;
  role: string;
  active: boolean;
  persona_prompt: string | null;
  schedule: any;
}

export interface GsSlot {
  id: string;
  seller_id: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  source: string;
  notes: string | null;
}

export interface GsFact {
  id: string;
  fact_type: string;
  key: string;
  value: string;
  metadata: any;
  active: boolean;
}

export function useGsConversations() {
  const [data, setData] = useState<GsConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: rows, error } = await supabase
      .from("gs_whatsapp_conversations" as any)
      .select("*, contact:gs_whatsapp_contacts(*)")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) console.error("load gs conversations failed:", error);
    setData((rows ?? []) as any);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`gs-inbox-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "gs_whatsapp_conversations" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "gs_whatsapp_contacts" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "gs_whatsapp_messages" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  return { data, loading, reload: load };
}

export function useGsMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<GsMessage[]>([]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("gs_whatsapp_messages" as any)
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) console.error("load gs messages failed:", error);
      if (alive) setMessages((data ?? []) as any);
    })();

    const ch = supabase
      .channel(`gs-msg-${conversationId}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gs_whatsapp_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (p) =>
          setMessages((current) => {
            if (p.eventType === "DELETE") {
              return current.filter((m) => m.id !== (p.old as any).id);
            }
            const next = current.some((m) => m.id === (p.new as any).id)
              ? current.map((m) => (m.id === (p.new as any).id ? (p.new as any) : m))
              : [...current, p.new as any];
            return next.sort(
              (a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            );
          }),
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [conversationId]);

  return messages;
}

export function useGsMessageSearchIndex() {
  const [index, setIndex] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    const { data, error } = await supabase
      .from("gs_whatsapp_messages" as any)
      .select("conversation_id, body, transcript")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) {
      console.error("load gs message search index failed:", error);
      return;
    }
    const next: Record<string, string> = {};
    for (const row of (data ?? []) as any[]) {
      const key = row.conversation_id;
      if (!key) continue;
      next[key] = [next[key], row.body, row.transcript].filter(Boolean).join(" ");
    }
    setIndex(next);
  }, []);

  useEffect(() => {
    reload();
    const ch = supabase
      .channel(`gs-message-search-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gs_whatsapp_messages" }, reload)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "gs_whatsapp_messages" }, reload)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [reload]);

  return index;
}

export function useGsDiagnostics() {
  const [counts, setCounts] = useState({ conversations: 0, messages: 0, lidConversations: 0, backfillEvents: 0 });

  const reload = useCallback(async () => {
    const [conversationResult, messageResult, eventResult] = await Promise.all([
      supabase
        .from("gs_whatsapp_conversations" as any)
        .select("id, remote_jid, contact:gs_whatsapp_contacts(name, display_name, phone, raw)"),
      supabase
        .from("gs_whatsapp_messages" as any)
        .select("id, provider_message_id, body"),
      supabase
        .from("gs_whatsapp_events" as any)
        .select("id, event_type")
        .eq("event_type", "evolution_history_backfill"),
    ]);
    const conversations = (conversationResult.data ?? []) as any[];
    const messages = (messageResult.data ?? []) as any[];
    setCounts({
      conversations: conversations.length,
      messages: messages.length,
      lidConversations: conversations.filter((c) => String(c.remote_jid ?? "").includes("@lid")).length,
      backfillEvents: (eventResult.data ?? []).length,
    });
  }, []);

  useEffect(() => {
    reload();
    const ch = supabase
      .channel(`gs-diagnostics-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "gs_whatsapp_conversations" }, reload)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gs_whatsapp_messages" }, reload)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [reload]);

  return counts;
}

export function useGsTable<T = any>(table: string, order?: { col: string; asc?: boolean }) {
  const [data, setData] = useState<T[]>([]);
  const reload = useCallback(async () => {
    let q = supabase.from(table as any).select("*");
    if (order) q = q.order(order.col, { ascending: order.asc ?? true });
    const { data: rows } = await q;
    setData((rows ?? []) as any);
  }, [table, order?.col, order?.asc]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, reload };
}
