import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const PROJECT_REF =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ??
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)
    ?.replace("https://", "")
    .split(".")[0] ??
  "—";

export function GsRealtimeStatus({
  conversationCount,
  totalMessageCount,
  selectedConversationId,
  selectedRemoteJid,
  messageCount,
}: {
  conversationCount: number;
  totalMessageCount: number;
  selectedConversationId: string | null;
  selectedRemoteJid: string | null;
  messageCount: number;
}) {
  const [status, setStatus] = useState<"connecting" | "connected" | "closed">(
    "connecting",
  );

  useEffect(() => {
    const ch = supabase
      .channel("gs-status-probe")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gs_whatsapp_messages" },
        () => {},
      )
      .subscribe((s) => {
        if (s === "SUBSCRIBED") setStatus("connected");
        else if (s === "CLOSED" || s === "CHANNEL_ERROR") setStatus("closed");
      });
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const dot =
    status === "connected"
      ? "bg-success"
      : status === "connecting"
        ? "bg-warning animate-pulse"
        : "bg-destructive";

  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground border-b bg-muted/30 px-6 py-1.5">
      <span className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        Realtime {status}
      </span>
      <span className="opacity-60">·</span>
      <span>
        Supabase <code className="font-mono">{PROJECT_REF}</code>
      </span>
      <span className="opacity-60">·</span>
      <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
        {conversationCount} conversas reais
      </Badge>
      <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
        {totalMessageCount} msgs total
      </Badge>
      <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-mono">
        id {selectedConversationId ?? "—"}
      </Badge>
      <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-mono">
        jid {selectedRemoteJid ?? "—"}
      </Badge>
      <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
        {messageCount} msgs carregadas
      </Badge>
    </div>
  );
}
