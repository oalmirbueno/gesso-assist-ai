import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, type KeyboardEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MessageSquare, UserCheck, Bot, Mic, FileText, Users, Search, Send,
  Sparkles, CheckCircle2, AlertTriangle, Calendar, BookOpen, Headphones,
  Activity, X,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  getGsConversationDisplayName, jidLocalId, useGsConversations, useGsDiagnostics,
  useGsMessageSearchIndex, useGsMessages, useGsTable,
  type GsConversation, type GsMessage, type GsSeller, type GsSlot, type GsFact,
} from "@/hooks/useGsRealtime";
import { gsService, type GsCommandResult } from "@/services/gsGessoWhatsAppService";
import { GsRealtimeStatus } from "@/components/GsRealtimeStatus";

/** Toast curado por comando, fala da equipe GS, não jargão técnico. */
function commandFeedback(
  r: GsCommandResult,
  copy: { success: string; pending?: string; error: string },
) {
  if (!r.ok) return toast.error(copy.error);
  if (r.pending_connector)
    return toast.info(copy.pending ?? "Comando salvo no painel. Conector n8n ainda pendente.");
  return toast.success(copy.success);
}

interface GsEventRow {
  id: string;
  conversation_id: string | null;
  event_type: string;
  payload: any;
  created_at: string;
}

function useGsEvents(conversationId: string | null, limit = 8) {
  const [events, setEvents] = useState<GsEventRow[]>([]);
  useEffect(() => {
    if (!conversationId) {
      setEvents([]);
      return;
    }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("gs_whatsapp_events" as any)
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (alive) setEvents((data ?? []) as any);
    })();
    const ch = supabase
      .channel(`gs-events-${conversationId}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gs_whatsapp_events",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (p) => setEvents((prev) => [p.new as any, ...prev].slice(0, limit)),
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [conversationId, limit]);
  return events;
}

export const Route = createFileRoute("/whatsapp")({
  component: WhatsAppCockpit,
  head: () => ({
    meta: [
      { title: "Atendimento WhatsApp, GS Gesso" },
      { name: "description", content: "Cockpit de atendimento WhatsApp com IA, CRM e agenda da GS Gesso." },
    ],
  }),
});

const STATUS_LABELS: Record<string, string> = {
  nova: "Nova",
  em_atendimento: "Em atendimento",
  aguardando_cliente: "Aguardando cliente",
  precisa_humano: "Precisa humano",
  resolvida: "Resolvida",
  orcamento: "Orçamento",
};

const FUNNEL_LABELS: Record<string, string> = {
  novo: "Novo",
  qualificado: "Qualificado",
  orcamento: "Orçamento",
  negociacao: "Negociação",
  ganho: "Ganho",
  perdido: "Perdido",
  pos_venda: "Pós-venda",
};

function fmtTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString())
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function includesSearch(value: unknown, search: string) {
  return String(value ?? "").toLowerCase().includes(search);
}

function nonTextLabel(m: GsMessage): string {
  const t = String(m.message_type || m.raw?.messageType || "").toLowerCase();
  if (t.includes("contact")) {
    const name =
      m.raw?.message?.contactMessage?.displayName ||
      m.raw?.contactMessage?.displayName ||
      m.media?.displayName;
    return name ? `📇 Contato compartilhado: ${name}` : "📇 Contato compartilhado";
  }
  if (t.includes("image")) return "📷 Imagem recebida";
  if (t.includes("video")) return "🎥 Vídeo recebido";
  if (t.includes("document")) return "📄 Documento recebido";
  if (t.includes("sticker")) return "💟 Figurinha";
  if (t.includes("location")) return "📍 Localização compartilhada";
  if (t.includes("reaction")) return "👍 Reação";
  return "Mensagem sem texto";
}

function WhatsAppCockpit() {
  return (
    <AppShell
      title="Atendimento Comercial"
      subtitle="WhatsApp oficial GS Gesso · IA atende, você acompanha e intervém"
    >
      <div className="h-full flex flex-col bg-muted/20 overflow-hidden">
        <Tabs defaultValue="inbox" className="flex-1 flex flex-col min-h-0">
          <div className="border-b bg-card px-6">
            <TabsList className="h-12 bg-transparent gap-1 p-0">
              <TabsTrigger
                value="inbox"
                className="gap-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-4 font-semibold"
              >
                <MessageSquare className="h-4 w-4" />Conversas
              </TabsTrigger>
              <TabsTrigger
                value="vendedores"
                className="gap-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-4 font-semibold"
              >
                <Users className="h-4 w-4" />Vendedores
              </TabsTrigger>
              <TabsTrigger
                value="agenda"
                className="gap-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-4 font-semibold"
              >
                <Calendar className="h-4 w-4" />Agenda
              </TabsTrigger>
              <TabsTrigger
                value="base"
                className="gap-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-4 font-semibold"
              >
                <BookOpen className="h-4 w-4" />Base comercial
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="inbox" className="flex-1 min-h-0 m-0"><InboxView /></TabsContent>
          <TabsContent value="vendedores" className="flex-1 min-h-0 m-0 overflow-auto"><SellersView /></TabsContent>
          <TabsContent value="agenda" className="flex-1 min-h-0 m-0 overflow-auto"><AgendaView /></TabsContent>
          <TabsContent value="base" className="flex-1 min-h-0 m-0 overflow-auto"><BaseView /></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

/* ============== STATS CARDS ============== */
function StatCard({ icon: Icon, label, value, tone = "default" }: any) {
  const tones: Record<string, string> = {
    default: "bg-muted text-foreground",
    warn: "bg-warning/15 text-warning-foreground",
    ok: "bg-primary/20 text-foreground",
    info: "bg-info/15 text-info",
  };
  return (
    <div className="rounded-xl border bg-card p-3.5 flex items-center gap-3 hover:shadow-sm transition">
      <div className={`h-10 w-10 rounded-lg grid place-items-center ${tones[tone]}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="leading-tight min-w-0">
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold truncate">{label}</div>
        <div className="text-xl font-bold tabular-nums">{value}</div>
      </div>
    </div>
  );
}
/* ============== INBOX ============== */
function InboxView() {
  const { data: conversations, loading } = useGsConversations();
  const { data: sellers } = useGsTable<GsSeller>("gs_sellers");
  const [filter, setFilter] = useState("todas");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const messageSearchIndex = useGsMessageSearchIndex();

  const stats = useMemo(() => {
    const ativas = conversations.filter((c) => !["resolvida"].includes(c.status)).length;
    const human = conversations.filter((c) => c.needs_human).length;
    const ia = conversations.filter((c) => c.ai_enabled && !c.needs_human).length;
    const orc = conversations.filter((c) => c.funnel_stage === "orcamento" || c.status === "orcamento").length;
    const sellersOk = sellers.filter((s) => s.active).length;
    return { ativas, human, ia, orc, sellersOk };
  }, [conversations, sellers]);

  const filtered = useMemo(() => {
    let arr = conversations;
    if (filter === "novas") arr = arr.filter((c) => c.status === "nova");
    else if (filter === "humano") arr = arr.filter((c) => c.needs_human);
    else if (filter === "ia") arr = arr.filter((c) => c.ai_enabled && !c.needs_human);
    else if (filter === "atendimento") arr = arr.filter((c) => c.status === "em_atendimento");
    else if (filter === "orcamento") arr = arr.filter((c) => c.funnel_stage === "orcamento" || c.status === "orcamento");
    else if (filter === "resolvidas") arr = arr.filter((c) => c.status === "resolvida");

    if (search.trim()) {
      const s = search.toLowerCase();
      arr = arr.filter((c) =>
        [
          getGsConversationDisplayName(c), c.remote_jid, jidLocalId(c.remote_jid), c.contact?.phone,
          c.contact?.display_name, c.contact?.name, c.contact?.raw?.pushName, c.contact?.neighborhood,
          c.contact?.interest, c.intent, c.summary, messageSearchIndex[c.id],
        ].some((v) => includesSearch(v, s)),
      );
    }
    return arr;
  }, [conversations, filter, messageSearchIndex, search]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const selectedMessages = useGsMessages(selectedId);
  const diagnostics = useGsDiagnostics();

  useEffect(() => {
    if (filtered.length === 0) {
      if (selectedId) setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((c) => c.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  return (
    <div className="h-full flex flex-col">
      {/* stats minimalistas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 border-b bg-card/40">
        <StatCard icon={MessageSquare} label="Ativas" value={stats.ativas} tone="info" />
        <StatCard icon={AlertTriangle} label="Precisam humano" value={stats.human} tone="warn" />
        <StatCard icon={Bot} label="IA ativa" value={stats.ia} tone="ok" />
        <StatCard icon={FileText} label="Orçamentos" value={stats.orc} />
      </div>

      {/* main 3-pane */}
      <div className="flex-1 grid grid-cols-12 min-h-0">
        {/* lista */}
        <aside className="col-span-12 md:col-span-4 lg:col-span-3 border-r flex flex-col min-h-0">
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8 h-9" placeholder="Buscar nome, telefone, bairro…"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-1">
              {[
                ["todas","Todas"],["novas","Novas"],["humano","Precisa humano"],
                ["ia","IA ativa"],["atendimento","Em atend."],["orcamento","Orçamento"],["resolvidas","Resolvidas"],
              ].map(([k,l]) => (
                <button key={k} onClick={() => setFilter(k)}
                  className={`text-[11px] px-2 py-1 rounded-md border transition ${
                    filter === k ? "bg-primary text-primary-foreground border-primary"
                                 : "bg-background hover:bg-muted text-muted-foreground"
                  }`}>{l}</button>
              ))}
            </div>
          </div>
          <ScrollArea className="flex-1">
            {loading && <div className="p-6 text-xs text-muted-foreground">Carregando…</div>}
            {!loading && filtered.length === 0 && <EmptyConversations />}
            <ul>
              {filtered.map((c) => {
                const seller = sellers.find((s) => s.id === c.current_seller_id);
                const active = c.id === selectedId;
                const displayName = getGsConversationDisplayName(c);
                return (
                  <li key={c.id}>
                    <button onClick={() => setSelectedId(c.id)}
                      className={`w-full text-left px-3 py-2.5 border-b hover:bg-muted/50 transition ${
                        active ? "bg-muted" : ""
                      }`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-sm truncate">
                          {displayName}
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{fmtTime(c.last_message_at)}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {c.contact?.phone || jidLocalId(c.remote_jid)}{c.contact?.neighborhood ? ` · ${c.contact.neighborhood}` : ""}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <Badge variant="outline" className="text-[9px] py-0 h-4">
                          {STATUS_LABELS[c.status] ?? c.status}
                        </Badge>
                        {c.needs_human && <Badge className="text-[9px] py-0 h-4 bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20">precisa humano</Badge>}
                        {c.ai_enabled && !c.needs_human && <Badge className="text-[9px] py-0 h-4 bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20">IA</Badge>}
                        {c.ai_draft_reply && <Badge className="text-[9px] py-0 h-4 bg-sky-500/15 text-sky-600 border-sky-500/30 hover:bg-sky-500/20">rascunho</Badge>}
                        {seller && <Badge variant="secondary" className="text-[9px] py-0 h-4">{seller.name}</Badge>}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        </aside>

        {/* chat */}
        <section className="col-span-12 md:col-span-5 lg:col-span-6 flex flex-col min-h-0 border-r">
          {selected ? <ConversationView conv={selected} sellers={sellers} messages={selectedMessages} /> : <NoConversationSelected />}
        </section>

        {/* CRM */}
        <aside className="hidden md:flex col-span-3 flex-col min-h-0 overflow-auto">
          {selected ? <CrmPanel conv={selected} sellers={sellers} messages={selectedMessages} /> : (
            <div className="p-6 text-xs text-muted-foreground">Selecione uma conversa para ver dados do cliente.</div>
          )}
        </aside>
      </div>
    </div>
  );
}

function EmptyConversations() {
  return (
    <div className="p-8 text-center space-y-3">
      <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/50" />
      <div className="text-sm font-medium">Nenhuma conversa de produção sincronizada ainda</div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        O painel agora ignora testes/backfills antigos e mostra somente eventos reais recebidos do Evolution/n8n.
      </p>
    </div>
  );
}

function NoConversationSelected() {
  return (
    <div className="flex-1 grid place-items-center text-center p-10">
      <div className="space-y-3 max-w-sm">
        <div className="h-12 w-12 rounded-full bg-muted grid place-items-center mx-auto">
          <MessageSquare className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-base font-medium">Selecione uma conversa</h3>
        <p className="text-xs text-muted-foreground">
          O n8n recebe as mensagens do WhatsApp da GS Gesso, transcreve áudios e
          envia para este painel em tempo real.
        </p>
      </div>
    </div>
  );
}

/* ============== MESSAGE DIAGNOSTICS ============== */
function MessageDiagnostics({ messages }: { messages: GsMessage[] }) {
  const counts = useMemo(() => {
    const c = { total: messages.length, inbound: 0, outbound: 0, audio: 0, ai: 0, client: 0, human: 0, system: 0 };
    for (const m of messages) {
      if (m.direction === "inbound") c.inbound += 1; else c.outbound += 1;
      if (m.message_type === "audio" || m.audio_url) c.audio += 1;
      if (m.sender_type === "ai") c.ai += 1;
      else if (m.sender_type === "client") c.client += 1;
      else if (m.sender_type === "human") c.human += 1;
      else if (m.sender_type === "system") c.system += 1;
    }
    return c;
  }, [messages]);
  if (counts.total === 0) return null;
  return (
    <div className="border-t bg-muted/30 px-4 py-1.5 text-[10px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 font-mono shrink-0">
      <span>msgs: <b className="text-foreground">{counts.total}</b></span>
      <span>in: {counts.inbound}</span>
      <span>out: {counts.outbound}</span>
      <span>áudio: {counts.audio}</span>
      <span>ai: {counts.ai}</span>
      <span>client: {counts.client}</span>
      <span>human: {counts.human}</span>
      {counts.system > 0 && <span>system: {counts.system}</span>}
    </div>
  );
}

/* ============== CONVERSATION VIEW ============== */
function ConversationView({
  conv,
  sellers,
  messages,
}: {
  conv: GsConversation;
  sellers: GsSeller[];
  messages: GsMessage[];
}) {
  const events = useGsEvents(conv.id);
  const [draft, setDraft] = useState("");
  const [aiDraft, setAiDraft] = useState<{ text: string; pending: boolean } | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // Sincroniza rascunho persistido (vindo via realtime/n8n) com a UI local.
  useEffect(() => {
    if (conv.ai_draft_reply) setAiDraft({ text: conv.ai_draft_reply, pending: false });
  }, [conv.ai_draft_reply]);

  async function takeOver() {
    setBusy("take");
    const r = await gsService.pauseAi(conv.id, "human_assumed");
    setBusy(null);
    commandFeedback(r, {
      success: "Conversa assumida.",
      pending: "Conversa assumida no painel. Conector n8n ainda pendente.",
      error: "Não foi possível assumir a conversa.",
    });
  }
  async function returnToAi() {
    setBusy("return");
    const r = await gsService.resumeAi(conv.id);
    setBusy(null);
    commandFeedback(r, {
      success: "IA religada para esta conversa.",
      pending: "IA religada no painel. Conector n8n ainda pendente.",
      error: "Não foi possível devolver para a IA.",
    });
  }
  async function markResolved() {
    const r = await gsService.markResolved(conv.id);
    commandFeedback(r, { success: "Conversa marcada como resolvida.", error: "Não foi possível resolver." });
  }
  async function changeSeller(sellerKey: string) {
    const r = await gsService.changeSeller(conv.id, sellerKey);
    commandFeedback(r, { success: "Vendedor/persona atualizado.", error: "Não foi possível trocar o vendedor." });
  }
  async function requestDraft() {
    setBusy("draft");
    const r = await gsService.requestDraft(conv.id);
    setBusy(null);
    if (!r.ok) {
      toast.error("Não foi possível gerar rascunho.");
      return;
    }
    if (r.pending_connector) {
      setAiDraft({ text: "", pending: true });
      toast.info("Rascunho depende do conector n8n.", {
        description: "A solicitação ficou registrada. Quando o n8n responder, o rascunho aparece aqui.",
      });
      return;
    }
    if (r.draft) {
      setAiDraft({ text: r.draft, pending: false });
      toast.success("Rascunho gerado pela IA.");
    } else {
      toast.info("IA não devolveu rascunho desta vez.");
    }
  }
  async function sendHuman() {
    const text = draft.trim();
    if (!text) return;
    setBusy("send");
    setDraft("");
    const r = await gsService.sendHumanMessage(conv.id, text);
    setBusy(null);
    commandFeedback(r, {
      success: "Mensagem enviada.",
      pending: "Mensagem salva. Envio real depende do conector n8n.",
      error: "Falha ao enviar, tentar novamente.",
    });
  }
  function onComposerKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendHuman();
    }
  }

  const currentSeller = sellers.find((s) => s.id === conv.current_seller_id);
  const displayName = getGsConversationDisplayName(conv);
  const phoneOrJid = conv.contact?.phone || jidLocalId(conv.remote_jid) || conv.remote_jid;

  const initials =
    (displayName ?? "?")
      .replace(/[^A-Za-zÀ-ÿ0-9 ]/g, "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?";

  return (
    <>
      {/* header estilo WhatsApp */}
      <header className="border-b bg-card px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-full bg-primary/20 ring-1 ring-primary/40 grid place-items-center text-sm font-bold text-foreground/80">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{displayName}</div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
              <span>{phoneOrJid}</span>
              {conv.intent && <><span>·</span><span>{conv.intent}</span></>}
              {conv.funnel_stage && <><span>·</span><span>{FUNNEL_LABELS[conv.funnel_stage] ?? conv.funnel_stage}</span></>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select value={currentSeller?.key ?? ""} onValueChange={changeSeller}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Vendedor / persona" /></SelectTrigger>
            <SelectContent>
              {sellers.map((s) => (
                <SelectItem key={s.id} value={s.key} className="text-xs">
                  {s.name} {!s.active && "(inativo)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {conv.ai_enabled
            ? <Button size="sm" variant="outline" onClick={takeOver} disabled={busy === "take"}>
                <UserCheck className="h-3.5 w-3.5 mr-1.5" />Assumir
              </Button>
            : <Button size="sm" variant="outline" onClick={returnToAi} disabled={busy === "return"}>
                <Bot className="h-3.5 w-3.5 mr-1.5" />Devolver à IA
              </Button>
          }
          <Button size="sm" variant="ghost" onClick={markResolved}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Resolvida
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowAudit((v) => !v)} title="Eventos recentes">
            <Activity className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* AI status strip */}
      <div className="px-4 py-1.5 border-b bg-muted/40 text-[11px] text-muted-foreground flex items-center gap-3 flex-wrap shrink-0">
        {conv.ai_enabled ? (
          <span className="text-emerald-600 flex items-center gap-1"><Bot className="h-3 w-3" /> IA ligada</span>
        ) : (
          <span className="text-amber-600 flex items-center gap-1"><UserCheck className="h-3 w-3" /> Atendimento humano</span>
        )}
        {currentSeller && <span>· {currentSeller.name}</span>}
        {conv.last_ai_action && <span>· última ação: <span className="text-foreground">{conv.last_ai_action}</span></span>}
        {conv.needs_human && <span className="text-amber-600">· ⚠ {conv.needs_human_reason ?? "precisa humano"}</span>}
      </div>

      {/* messages, fundo WhatsApp */}
      <ScrollArea
        className="flex-1 min-h-0"
        style={{
          backgroundColor: "var(--wa-bg)",
          backgroundImage:
            "radial-gradient(color-mix(in oklab, var(--color-foreground) 6%, transparent) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      >
        <div className="px-4 py-5 space-y-2 max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-10">
              Sem mensagens nesta conversa ainda.
            </div>
          )}
          {messages.map((m, i) => {
            const isSystem = m.sender_type === "system";
            const inbound = m.direction === "inbound";
            const isAi = !inbound && m.sender_type === "ai";
            const isHuman = !inbound && m.sender_type === "human";
            const ps = m.provider_status as string | undefined;
            const prev = messages[i - 1];
            const grouped = prev && prev.direction === m.direction && prev.sender_type === m.sender_type;
            const audioUrl =
              m.audio_url ||
              m.media?.url ||
              m.media?.audio_url ||
              m.raw?.message?.audioMessage?.url ||
              m.raw?.audio_url ||
              null;
            const isAudio = m.message_type === "audio" || Boolean(audioUrl);

            if (isSystem) {
              return (
                <div key={m.id} className="flex justify-center">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/60 rounded-full px-3 py-1">
                    {m.body || m.intent || "evento do sistema"} · {fmtTime(m.created_at)}
                  </div>
                </div>
              );
            }

            const tail = inbound
              ? grouped ? "rounded-2xl" : "rounded-2xl rounded-tl-sm"
              : grouped ? "rounded-2xl" : "rounded-2xl rounded-tr-sm";
            const senderLabel = isAi ? "IA · GS" : isHuman ? "Atendente" : "GS Gesso";
            const senderBadgeColor = isAi
              ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
              : "bg-sky-500/15 text-sky-700 border-sky-500/30";

            return (
              <div key={m.id} className={`flex ${inbound ? "justify-start" : "justify-end"} ${grouped ? "mt-0.5" : "mt-2"}`}>
                <div
                  className={`max-w-[72%] px-3 py-2 text-sm shadow-sm ${tail}`}
                  style={{
                    backgroundColor: inbound ? "var(--wa-bubble-in)" : "var(--wa-bubble-out)",
                    color: "var(--color-foreground)",
                  }}
                >
                  {!inbound && !grouped && (
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className={`text-[9px] uppercase tracking-wide font-semibold border rounded px-1 py-px ${senderBadgeColor}`}>
                        {senderLabel}
                      </span>
                    </div>
                  )}
                  {isAudio && (
                    <div className="mb-1 space-y-1">
                      {audioUrl ? (
                        <audio controls src={audioUrl} className="max-w-full h-8" />
                      ) : (
                        <div className="text-[11px] text-foreground/70 flex items-center gap-1.5 bg-foreground/5 rounded px-2 py-1">
                          <Mic className="h-3 w-3" /> Áudio sem mídia disponível
                        </div>
                      )}
                      {m.transcript ? (
                        <div className="text-[11px] italic text-foreground/70">🎙 {m.transcript}</div>
                      ) : (
                        <div className="text-[11px] italic text-foreground/50">
                          Áudio recebido — transcrição pendente
                        </div>
                      )}
                    </div>
                  )}
                  {!isAudio && m.transcript && (
                    <div className="text-[11px] italic mb-1 text-foreground/60">🎙 {m.transcript}</div>
                  )}
                  {!isAudio && m.body && <div className="whitespace-pre-wrap leading-snug">{m.body}</div>}
                  {!isAudio && !m.body && !m.transcript && (
                    <div className="text-sm italic text-foreground/70">
                      {nonTextLabel(m)}
                    </div>
                  )}
                  <div className="text-[10px] mt-1 flex items-center gap-1.5 justify-end text-foreground/50">
                    {m.intent && <span>{m.intent}</span>}
                    {m.confidence != null && <span>({Math.round(m.confidence * 100)}%)</span>}
                    <span>{fmtTime(m.created_at)}</span>
                    {!inbound && ps === "pending" && <span title="Aguardando envio">🕓 Aguardando</span>}
                    {!inbound && ps === "sent" && <span className="text-sky-600" title="Enviado">✓✓ Enviado</span>}
                    {!inbound && ps === "delivered" && <span className="text-sky-600" title="Entregue">✓✓</span>}
                    {!inbound && ps === "failed" && <span className="text-red-500" title="Falhou">⚠ Falhou</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* diagnóstico de mensagens */}
      <MessageDiagnostics messages={messages} />

      {/* eventos recentes (auditoria) */}
      {showAudit && (
        <div className="border-t bg-card/70 px-4 py-2 max-h-44 overflow-auto shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Activity className="h-3 w-3" />Eventos recentes
            </span>
            <button onClick={() => setShowAudit(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </div>
          {events.length === 0 && (
            <div className="text-[11px] text-muted-foreground py-2">Sem eventos registrados ainda.</div>
          )}
          <ul className="space-y-1">
            {events.map((ev) => {
              const pending = ev.event_type === "connector_pending";
              return (
                <li key={ev.id} className="text-[11px] flex items-center gap-2 font-mono">
                  <span className="text-muted-foreground w-12 shrink-0">{fmtTime(ev.created_at)}</span>
                  <span className={pending ? "text-amber-600" : "text-foreground"}>{ev.event_type}</span>
                  {pending && <span className="text-muted-foreground">· conector n8n ainda pendente</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* draft IA */}
      {aiDraft && (
        <div className="border-t bg-sky-500/5 p-3 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-sky-600 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />Rascunho da IA
              {conv.ai_confidence != null && (
                <span className="text-muted-foreground font-normal">· {Math.round(conv.ai_confidence * 100)}% confiança</span>
              )}
            </span>
            <div className="flex gap-1">
              {!aiDraft.pending && aiDraft.text && (
                <Button size="sm" variant="ghost" className="h-6 text-[11px]"
                  onClick={() => { setDraft(aiDraft.text); }}>
                  Usar no campo
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-6 text-[11px]"
                onClick={() => setAiDraft(null)}>
                Descartar
              </Button>
            </div>
          </div>
          {aiDraft.pending ? (
            <p className="text-xs text-muted-foreground italic">
              Rascunho depende do conector n8n. Aguardando resposta…
            </p>
          ) : (
            <p className="text-xs text-foreground/80 italic whitespace-pre-wrap">"{aiDraft.text}"</p>
          )}
        </div>
      )}

      {/* composer estilo WhatsApp */}
      <div className="border-t p-3 bg-card shrink-0">
        <div className="flex gap-2 items-end">
          <div className="flex-1 rounded-2xl border bg-background focus-within:border-primary/60 transition-colors">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onComposerKey}
              placeholder="Escreva sua resposta… (Enter envia, Shift+Enter quebra linha)"
              className="min-h-[44px] max-h-32 resize-none text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-3.5 py-2.5"
            />
          </div>
          <Button size="sm" variant="outline" onClick={requestDraft} disabled={busy === "draft"} className="h-10">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {busy === "draft" ? "Gerando…" : "IA"}
          </Button>
          <Button
            size="sm"
            onClick={sendHuman}
            disabled={!draft.trim() || busy === "send"}
            className="h-10 rounded-full px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
          Ao enviar, a IA pausa automaticamente nesta conversa. Devolva para a IA quando terminar.
        </p>
      </div>
    </>
  );
}

/* ============== CRM PANEL ============== */
function CrmPanel({ conv, messages }: { conv: GsConversation; sellers: GsSeller[]; messages: GsMessage[] }) {
  const c = conv.contact;
  const [stage, setStage] = useState(c?.stage ?? "novo");
  const [notes, setNotes] = useState(c?.notes ?? "");
  const [nextAction, setNextAction] = useState(c?.next_action ?? "");
  const latestIntent = [...messages].reverse().find((m) => m.intent)?.intent ?? conv.intent;
  const latestAiReply = [...messages].reverse().find((m) => m.ai_reply)?.ai_reply ?? conv.ai_draft_reply;
  const aiDecision = (conv.ai_last_decision ?? {}) as any;
  const collectedFields = aiDecision.collected_fields ?? aiDecision.collected ?? null;
  const missingFields = aiDecision.missing_fields ?? aiDecision.missing ?? null;
  const displayName = getGsConversationDisplayName(conv);

  async function save() {
    if (!c) return;
    const { error } = await supabase.from("gs_whatsapp_contacts" as any)
      .update({ stage, notes, next_action: nextAction }).eq("id", c.id);
    if (error) toast.error("Erro ao salvar"); else toast.success("Cliente atualizado");
  }

  if (!c) return null;
  return (
    <div className="p-4 space-y-4 text-sm">
      <div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Cliente</div>
        <div className="font-semibold">{displayName}</div>
        <div className="text-xs text-muted-foreground font-mono">{c.phone || jidLocalId(conv.remote_jid) || "·"}</div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
        <Field label="Resumo" value={conv.summary} />
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Field label="Última intenção" value={latestIntent} />
          <Field label="Etapa" value={FUNNEL_LABELS[c.stage] ?? c.stage} />
        </div>
        {latestAiReply && <Field label="Última resposta IA" value={latestAiReply} />}
        {collectedFields && <Field label="Campos coletados" value={JSON.stringify(collectedFields)} />}
        {missingFields && <Field label="Campos faltantes" value={Array.isArray(missingFields) ? missingFields.join(", ") : JSON.stringify(missingFields)} />}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Field label="Cidade" value={c.city} />
        <Field label="Bairro" value={c.neighborhood} />
        <Field label="Interesse" value={c.interest} className="col-span-2" />
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Etapa CRM</label>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger className="h-8 mt-1 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(FUNNEL_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Próxima ação</label>
        <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)}
          placeholder="Ex: enviar orçamento até quarta" className="h-8 mt-1 text-xs" />
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Observações</label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          className="mt-1 text-xs min-h-[80px]" />
      </div>

      {Array.isArray(c.tags) && c.tags.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Tags</div>
          <div className="flex flex-wrap gap-1">
            {c.tags.map((t: string) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
          </div>
        </div>
      )}

      <Button size="sm" className="w-full" onClick={save}>Salvar CRM</Button>
    </div>
  );
}
function Field({ label, value, className = "" }: { label: string; value?: string | null; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-foreground/90">{value || <span className="text-muted-foreground">·</span>}</div>
    </div>
  );
}

/* ============== SELLERS ============== */
function SellersView() {
  const { data: sellers, reload } = useGsTable<GsSeller>("gs_sellers", { col: "name" });
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("atendimento_humano");

  async function create() {
    if (!name.trim()) return;
    const key = name.toLowerCase().replace(/\s+/g, "_").slice(0, 32);
    const { error } = await supabase.from("gs_sellers" as any).insert({ key, name, role });
    if (error) return toast.error(error.message);
    toast.success("Vendedor criado");
    setName(""); setCreating(false); reload();
  }
  async function toggleActive(s: GsSeller) {
    await supabase.from("gs_sellers" as any).update({ active: !s.active }).eq("id", s.id);
    reload();
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Vendedores e personas</h2>
          <p className="text-xs text-muted-foreground">Equipe humana e personas usadas pela IA do n8n.</p>
        </div>
        <Button size="sm" onClick={() => setCreating((v) => !v)}>{creating ? "Cancelar" : "+ Novo vendedor"}</Button>
      </div>

      {creating && (
        <div className="rounded-lg border bg-card p-4 grid md:grid-cols-3 gap-3">
          <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="atendimento_humano">Atendimento humano</SelectItem>
              <SelectItem value="atendimento_ia">Atendimento IA</SelectItem>
              <SelectItem value="gestor">Gestor</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={create}>Salvar</Button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {sellers.map((s) => (
          <div key={s.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.role} · key: {s.key}</div>
              </div>
              <button onClick={() => toggleActive(s)}
                className={`text-[10px] px-2 py-0.5 rounded ${
                  s.active ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"
                }`}>{s.active ? "ativo" : "inativo"}</button>
            </div>
            {s.persona_prompt && (
              <p className="text-xs text-muted-foreground mt-2 italic line-clamp-3">"{s.persona_prompt}"</p>
            )}
          </div>
        ))}
        {sellers.length === 0 && (
          <div className="col-span-2 rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhum vendedor cadastrado.
          </div>
        )}
      </div>
    </div>
  );
}

/* ============== AGENDA ============== */
function AgendaView() {
  const { data: slots } = useGsTable<GsSlot>("gs_availability_slots", { col: "starts_at" });
  const { data: sellers } = useGsTable<GsSeller>("gs_sellers");
  const tones: Record<string, string> = {
    livre: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    ocupado: "bg-sky-500/15 text-sky-600 border-sky-500/30",
    bloqueado: "bg-muted text-muted-foreground",
    reservado: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  };
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Agenda da equipe</h2>
        <p className="text-xs text-muted-foreground">Slots de disponibilidade. Sincronização Google Calendar virá em breve.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {slots.map((sl) => {
          const seller = sellers.find((x) => x.id === sl.seller_id);
          return (
            <div key={sl.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  {new Date(sl.starts_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} →{" "}
                  {new Date(sl.ends_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
                <Badge variant="outline" className={`text-[10px] ${tones[sl.status] ?? ""}`}>{sl.status}</Badge>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {seller?.name ?? "Sem vendedor"} · origem {sl.source}
              </div>
              {sl.notes && <div className="text-xs mt-1">{sl.notes}</div>}
            </div>
          );
        })}
        {slots.length === 0 && (
          <div className="col-span-2 rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhum slot de agenda. A sincronização começa quando o n8n enviar eventos.
          </div>
        )}
      </div>
    </div>
  );
}

/* ============== BASE COMERCIAL ============== */
function BaseView() {
  const { data: facts, reload } = useGsTable<GsFact>("gs_commercial_facts", { col: "fact_type" });
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ fact_type: "produto", key: "", value: "" });

  async function create() {
    if (!form.key.trim() || !form.value.trim()) return;
    const { error } = await supabase.from("gs_commercial_facts" as any).insert(form);
    if (error) return toast.error(error.message);
    toast.success("Fato comercial salvo");
    setForm({ fact_type: form.fact_type, key: "", value: "" });
    setCreating(false); reload();
  }

  const grouped = useMemo(() => {
    const g: Record<string, GsFact[]> = {};
    facts.forEach((f) => { (g[f.fact_type] ??= []).push(f); });
    return g;
  }, [facts]);

  const TYPES = ["produto","preco_base","bairro","entrega","objecao","script","regra"];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Base comercial</h2>
          <p className="text-xs text-muted-foreground">
            Fonte de verdade da IA. Só é usada quando o n8n consulta, a IA não inventa preço, prazo ou estoque.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating((v) => !v)}>{creating ? "Cancelar" : "+ Novo fato"}</Button>
      </div>

      {creating && (
        <div className="rounded-lg border bg-card p-4 grid md:grid-cols-4 gap-3">
          <Select value={form.fact_type} onValueChange={(v) => setForm((f) => ({ ...f, fact_type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Chave (ex: gesso_3d)" value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} />
          <Input placeholder="Valor" className="md:col-span-1" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
          <Button onClick={create}>Salvar</Button>
        </div>
      )}

      {TYPES.map((type) => {
        const items = grouped[type] ?? [];
        return (
          <div key={type} className="rounded-lg border bg-card">
            <div className="px-4 py-2 border-b text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {type} <span className="ml-1 text-foreground">({items.length})</span>
            </div>
            <div className="divide-y">
              {items.length === 0 && <div className="px-4 py-3 text-xs text-muted-foreground">Vazio</div>}
              {items.map((f) => (
                <div key={f.id} className="px-4 py-2 grid grid-cols-3 gap-3 text-sm">
                  <div className="font-mono text-xs">{f.key}</div>
                  <div className="col-span-2 text-foreground/90">{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
