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
  confidence: number | null;
  created_at: string;
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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gs_whatsapp_messages" }, load)
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
          event: "INSERT",
          schema: "public",
          table: "gs_whatsapp_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (p) =>
          setMessages((current) => {
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

export function useGsDiagnostics() {
  const [counts, setCounts] = useState({ conversations: 0, messages: 0 });

  const reload = useCallback(async () => {
    const [conversationResult, messageResult] = await Promise.all([
      supabase
        .from("gs_whatsapp_conversations" as any)
        .select("id"),
      supabase
        .from("gs_whatsapp_messages" as any)
        .select("id"),
    ]);
    setCounts({
      conversations: conversationResult.data?.length ?? 0,
      messages: messageResult.data?.length ?? 0,
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
