import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Contact, Conversation, Message } from "@/types/domain";

export interface ConversationWithContact extends Conversation {
  contact?: Contact;
  last_message?: Message;
}

/**
 * Fetches conversations from Supabase with realtime updates.
 * Returns null while loading; caller can fall back to mocks if list is empty.
 */
export function useRealtimeConversations() {
  const [data, setData] = useState<ConversationWithContact[] | null>(null);

  async function load() {
    const { data: convs, error } = await supabase
      .from("conversations")
      .select("*, contact:contacts(*)")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(100);
    if (error) {
      console.error("load conversations failed:", error);
      setData([]);
      return;
    }
    setData((convs ?? []) as ConversationWithContact[]);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("inbox-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
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
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    let active = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) console.error(error);
      if (active) setMessages((data ?? []) as Message[]);
    };
    load();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((m) => [...m, payload.new as Message]);
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
