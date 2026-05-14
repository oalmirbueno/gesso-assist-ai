import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useGsConversations, useGsMessages, useGsTable,
  type GsConversation, type GsSeller, type GsSlot, type GsFact,
} from "@/hooks/useGsRealtime";
import { gsService, commandToast, type GsCommandResult } from "@/services/gsGessoWhatsAppService";

function runToast(r: GsCommandResult) {
  const t = commandToast(r);
  if (t.type === "success") toast.success(t.msg);
  else if (t.type === "info") toast.info(t.msg);
  else toast.error(t.msg);
}

export const Route = createFileRoute("/whatsapp")({
  component: WhatsAppCockpit,
  head: () => ({
    meta: [
      { title: "Atendimento WhatsApp — GS Gesso" },
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

function WhatsAppCockpit() {
  return (
    <AppShell title="Atendimento WhatsApp">
      <div className="h-[calc(100vh-3.5rem)] flex flex-col">
        <Tabs defaultValue="inbox" className="flex-1 flex flex-col min-h-0">
          <div className="border-b bg-card px-4">
            <TabsList className="h-12 bg-transparent gap-1">
              <TabsTrigger value="inbox" className="gap-2"><MessageSquare className="h-4 w-4" />Inbox</TabsTrigger>
              <TabsTrigger value="vendedores" className="gap-2"><Users className="h-4 w-4" />Vendedores</TabsTrigger>
              <TabsTrigger value="agenda" className="gap-2"><Calendar className="h-4 w-4" />Agenda da equipe</TabsTrigger>
              <TabsTrigger value="base" className="gap-2"><BookOpen className="h-4 w-4" />Base comercial</TabsTrigger>
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
    default: "text-foreground",
    warn: "text-amber-500",
    ok: "text-emerald-500",
    info: "text-sky-500",
  };
  return (
    <div className="rounded-lg border bg-card p-3 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-md bg-muted grid place-items-center ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="leading-tight">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
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
        [c.contact?.name, c.contact?.phone, c.contact?.neighborhood, c.contact?.interest, c.intent]
          .filter(Boolean).some((v) => String(v).toLowerCase().includes(s)),
      );
    }
    return arr;
  }, [conversations, filter, search]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="h-full flex flex-col">
      {/* stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4 border-b bg-card/50">
        <StatCard icon={MessageSquare} label="Conversas ativas" value={stats.ativas} tone="info" />
        <StatCard icon={AlertTriangle} label="Precisam humano" value={stats.human} tone="warn" />
        <StatCard icon={Bot} label="IA ativa" value={stats.ia} tone="ok" />
        <StatCard icon={Mic} label="Áudios hoje" value="—" />
        <StatCard icon={FileText} label="Orçamentos abertos" value={stats.orc} />
        <StatCard icon={Headphones} label="Vendedores ativos" value={stats.sellersOk} tone="ok" />
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
                return (
                  <li key={c.id}>
                    <button onClick={() => setSelectedId(c.id)}
                      className={`w-full text-left px-3 py-2.5 border-b hover:bg-muted/50 transition ${
                        active ? "bg-muted" : ""
                      }`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-sm truncate">
                          {c.contact?.name ?? c.contact?.phone ?? "Sem nome"}
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{fmtTime(c.last_message_at)}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {c.contact?.phone}{c.contact?.neighborhood ? ` · ${c.contact.neighborhood}` : ""}
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
          {selected ? <ConversationView conv={selected} sellers={sellers} /> : <NoConversationSelected />}
        </section>

        {/* CRM */}
        <aside className="hidden md:flex col-span-3 flex-col min-h-0 overflow-auto">
          {selected ? <CrmPanel conv={selected} sellers={sellers} /> : (
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
      <div className="text-sm font-medium">Nenhuma conversa ainda</div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        A sincronização começa quando o n8n enviar eventos para
        <span className="font-mono text-[10px] block mt-1 text-foreground/70">receive-gs-gesso-event</span>
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

/* ============== CONVERSATION VIEW ============== */
function ConversationView({ conv, sellers }: { conv: GsConversation; sellers: GsSeller[] }) {
  const messages = useGsMessages(conv.id);
  const [draft, setDraft] = useState("");

  function notReady(action: string) {
    toast.info(`${action}: depende do conector n8n`, {
      description: "Aguardando endpoint seguro para envio. A ação foi registrada na auditoria.",
    });
  }

  async function logEvent(event_type: string, payload: any = {}) {
    await supabase.from("gs_whatsapp_events" as any).insert({
      conversation_id: conv.id, event_type, payload,
    });
  }

  async function takeOver() {
    await supabase.from("gs_whatsapp_conversations" as any)
      .update({ ai_enabled: false, status: "em_atendimento", needs_human: false })
      .eq("id", conv.id);
    await logEvent("human_taken_over");
    notReady("Assumir atendimento");
  }
  async function returnToAi() {
    await supabase.from("gs_whatsapp_conversations" as any)
      .update({ ai_enabled: true, needs_human: false })
      .eq("id", conv.id);
    await logEvent("returned_to_ai");
    notReady("Devolver para IA");
  }
  async function markResolved() {
    await supabase.from("gs_whatsapp_conversations" as any)
      .update({ status: "resolvida", needs_human: false })
      .eq("id", conv.id);
    await logEvent("resolved");
    toast.success("Conversa marcada como resolvida");
  }
  async function changeSeller(sellerId: string) {
    await supabase.from("gs_whatsapp_conversations" as any)
      .update({ current_seller_id: sellerId })
      .eq("id", conv.id);
    await logEvent("seller_changed", { seller_id: sellerId });
    toast.success("Vendedor/persona atualizado");
  }
  async function requestDraft() {
    await logEvent("draft_requested");
    notReady("Gerar rascunho com IA");
  }
  async function sendDraft() {
    if (!draft.trim()) return;
    await logEvent("human_outbound_queued", { body: draft });
    notReady("Enviar para WhatsApp");
    setDraft("");
  }

  const currentSeller = sellers.find((s) => s.id === conv.current_seller_id);

  return (
    <>
      {/* header */}
      <header className="border-b bg-card px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{conv.contact?.name ?? conv.contact?.phone}</div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{conv.contact?.phone}</span>
            {conv.intent && <><span>·</span><span>intenção: <span className="text-foreground">{conv.intent}</span></span></>}
            {conv.ai_confidence != null && <span>· {Math.round(conv.ai_confidence * 100)}% conf.</span>}
            {conv.funnel_stage && <><span>·</span><span>{FUNNEL_LABELS[conv.funnel_stage] ?? conv.funnel_stage}</span></>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={conv.current_seller_id ?? ""} onValueChange={changeSeller}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Vendedor / persona" /></SelectTrigger>
            <SelectContent>
              {sellers.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.name} {!s.active && "(inativo)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {conv.ai_enabled
            ? <Button size="sm" variant="outline" onClick={takeOver}><UserCheck className="h-3.5 w-3.5 mr-1.5" />Assumir</Button>
            : <Button size="sm" variant="outline" onClick={returnToAi}><Bot className="h-3.5 w-3.5 mr-1.5" />Devolver IA</Button>
          }
          <Button size="sm" variant="ghost" onClick={markResolved}><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Resolvida</Button>
        </div>
      </header>

      {/* AI status strip */}
      {(conv.last_ai_action || currentSeller || conv.needs_human_reason) && (
        <div className="px-4 py-1.5 border-b bg-muted/40 text-[11px] text-muted-foreground flex items-center gap-3 flex-wrap">
          {currentSeller && <span><Bot className="h-3 w-3 inline mr-1" />{currentSeller.name}</span>}
          {conv.last_ai_action && <span>última ação: <span className="text-foreground">{conv.last_ai_action}</span></span>}
          {conv.needs_human && <span className="text-amber-600">⚠ {conv.needs_human_reason ?? "precisa humano"}</span>}
        </div>
      )}

      {/* messages */}
      <ScrollArea className="flex-1 p-4 bg-muted/20">
        <div className="space-y-3 max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8">Sem mensagens nesta conversa ainda.</div>
          )}
          {messages.map((m) => {
            const inbound = m.direction === "inbound";
            return (
              <div key={m.id} className={`flex ${inbound ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                  inbound ? "bg-card border" : "bg-emerald-600 text-white"
                }`}>
                  {!inbound && (
                    <div className="text-[10px] uppercase tracking-wide opacity-80 mb-0.5">
                      {m.sender_type === "ai" ? "IA" : "Humano"}
                    </div>
                  )}
                  {m.audio_url && (
                    <audio controls src={m.audio_url} className="mb-1 max-w-full h-8" />
                  )}
                  {m.transcript && (
                    <div className={`text-[11px] italic mb-1 ${inbound ? "text-muted-foreground" : "text-white/80"}`}>
                      🎙 {m.transcript}
                    </div>
                  )}
                  {m.body && <div className="whitespace-pre-wrap">{m.body}</div>}
                  <div className={`text-[10px] mt-1 ${inbound ? "text-muted-foreground" : "text-white/70"}`}>
                    {fmtTime(m.created_at)}
                    {m.intent && ` · ${m.intent}`}
                    {m.confidence != null && ` (${Math.round(m.confidence * 100)}%)`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* draft IA */}
      {conv.ai_draft_reply && (
        <div className="border-t bg-sky-500/5 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-sky-600 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />Rascunho da IA
            </span>
            <Button size="sm" variant="ghost" className="h-6 text-[11px]"
              onClick={() => setDraft(conv.ai_draft_reply ?? "")}>Usar rascunho</Button>
          </div>
          <p className="text-xs text-foreground/80 italic">"{conv.ai_draft_reply}"</p>
        </div>
      )}

      {/* composer */}
      <div className="border-t p-3 bg-card">
        <div className="flex gap-2 items-end">
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)}
            placeholder="Mensagem para o cliente (envio depende do conector n8n)…"
            className="min-h-[60px] resize-none text-sm" />
          <div className="flex flex-col gap-2">
            <Button size="sm" variant="outline" onClick={requestDraft}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />Rascunho IA
            </Button>
            <Button size="sm" onClick={sendDraft} disabled={!draft.trim()}>
              <Send className="h-3.5 w-3.5 mr-1.5" />Enviar
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ============== CRM PANEL ============== */
function CrmPanel({ conv }: { conv: GsConversation; sellers: GsSeller[] }) {
  const c = conv.contact;
  const [stage, setStage] = useState(c?.stage ?? "novo");
  const [notes, setNotes] = useState(c?.notes ?? "");
  const [nextAction, setNextAction] = useState(c?.next_action ?? "");

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
        <div className="font-semibold">{c.name ?? "Sem nome"}</div>
        <div className="text-xs text-muted-foreground">{c.phone}</div>
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
      <div className="text-foreground/90">{value || <span className="text-muted-foreground">—</span>}</div>
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
            Fonte de verdade da IA. Só é usada quando o n8n consulta — a IA não inventa preço, prazo ou estoque.
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
