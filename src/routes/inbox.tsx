import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  contacts as mockContacts,
  conversations as mockConversations,
  messagesByConv as mockMessagesByConv,
  type ConvStatus,
  type Contact as MockContact,
  type Conversation as MockConversation,
  type Message as MockMessage,
} from "@/lib/mock-data";
import {
  useRealtimeConversations,
  useRealtimeMessages,
} from "@/hooks/useRealtimeConversations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  pauseAiInN8n,
  resumeAiInN8n,
  requestAiDraftFromN8n,
  sendHumanMessageToN8n,
} from "@/services/n8nService";
import { toast } from "sonner";
import {
  Search,
  Mic,
  Bot,
  User,
  Sparkles,
  CheckCheck,
  CornerDownLeft,
  Send,
  Play,
  Phone,
  MapPin,
  Tag,
  AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/inbox")({
  component: Inbox,
});

const filters = [
  { id: "all", label: "Todas" },
  { id: "nova", label: "Novas" },
  { id: "precisa_humano", label: "Precisa humano" },
  { id: "ia_respondendo", label: "IA respondendo" },
  { id: "em_atendimento", label: "Em atendimento" },
  { id: "aguardando_cliente", label: "Aguardando cliente" },
  { id: "resolvida", label: "Resolvidas" },
  { id: "leads_quentes", label: "Leads quentes" },
];

const statusLabel: Record<string, { label: string; className: string }> = {
  nova: { label: "Nova", className: "bg-info/15 text-info" },
  ia_respondendo: { label: "IA", className: "bg-primary/15 text-primary" },
  precisa_humano: { label: "Precisa humano", className: "bg-warning/20 text-warning-foreground" },
  em_atendimento: { label: "Em atendimento", className: "bg-accent text-accent-foreground" },
  aguardando_cliente: { label: "Aguardando", className: "bg-muted text-muted-foreground" },
  resolvida: { label: "Resolvida", className: "bg-success/15 text-success" },
};
const statusOf = (s: string) =>
  statusLabel[s] ?? { label: s, className: "bg-muted text-muted-foreground" };

function fmtTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const today = new Date();
  if (d.toDateString() === today.toDateString())
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString();
}

function Inbox() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const { user } = useAuthSession();

  const real = useRealtimeConversations();
  const useReal = !!real && real.length > 0;

  const { conversations, contacts } = useMemo(() => {
    if (useReal && real) {
      const cs: MockContact[] = real.map((r) => {
        const c = r.contact;
        const displayName =
          (c?.display_name ?? c?.name ?? "").toString().trim() ||
          c?.phone ||
          "(sem nome)";
        return {
          id: c?.id ?? r.contact_id,
          name: displayName,
          phone: c?.phone ?? "",
          city: c?.city ?? "",
          neighborhood: c?.neighborhood ?? "",
          customerType: "obra" as MockContact["customerType"],
          interest: c?.interest ?? "·",
          stage: ((c?.stage as MockContact["stage"]) ?? "novo"),
          tags: (Array.isArray(c?.tags) ? (c!.tags as string[]) : []) as string[],
          intentLevel: "media",
          objections: [],
          notes: c?.notes ?? undefined,
        };
      });
      const convs: MockConversation[] = real.map((r) => ({
        id: r.id,
        contactId: r.contact_id,
        status: r.status as ConvStatus,
        assignedUser: r.assigned_user_id ?? undefined,
        aiEnabled: r.ai_enabled,
        needsHuman: r.needs_human,
        needsHumanReason: r.needs_human_reason ?? undefined,
        priority: ((r.priority as MockConversation["priority"]) ?? "media"),
        lastMessageAt: fmtTime(r.last_message_at),
        unread: r.unread_count ?? 0,
        hasAudio: false,
        aiSummary: r.summary ?? r.ai_summary ?? "",
      }));
      return { conversations: convs, contacts: cs };
    }
    return { conversations: mockConversations, contacts: mockContacts };
  }, [useReal, real]);

  const getContact = (id: string) => contacts.find((c) => c.id === id);

  const [selectedId, setSelectedId] = useState<string>("");
  useEffect(() => {
    if (!selectedId && conversations[0]) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  const list = useMemo(() => {
    return conversations.filter((c) => {
      const ct = getContact(c.contactId);
      if (!ct) return false;
      if (search && !ct.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === "all") return true;
      if (filter === "leads_quentes") return ct.tags.includes("lead_quente");
      return c.status === filter;
    });
  }, [filter, search, conversations]);

  const selected =
    conversations.find((c) => c.id === selectedId) ?? conversations[0];
  const contact = selected ? getContact(selected.contactId) : undefined;
  const selectedReal = useReal && selected
    ? real?.find((r) => r.id === selected.id)
    : undefined;

  const realMsgs = useRealtimeMessages(useReal && selected ? selected.id : null);
  const messages: MockMessage[] = useReal
    ? (realMsgs.map((m) => ({
        id: m.id,
        conversationId: m.conversation_id,
        direction: (m.direction === "outbound" ? "outbound" : "inbound") as MockMessage["direction"],
        senderType: (m.sender_type as MockMessage["senderType"]) ?? "human",
        body: m.body ?? "",
        messageType: (m.message_type as MockMessage["messageType"]) ?? "text",
        audioUrl: m.audio_url ?? undefined,
        transcript: m.transcript ?? undefined,
        createdAt: fmtTime(m.created_at),
      })) as MockMessage[])
    : selected
      ? mockMessagesByConv[selected.id] ?? []
      : [];

  async function handleAssumir() {
    if (!selected) return;
    setBusy(true);
    try {
      if (useReal) {
        await supabase
          .from("gs_whatsapp_conversations")
          .update({
            assigned_user_id: user?.id ?? null,
            ai_enabled: false,
            needs_human: false,
            status: "em_atendimento",
          })
          .eq("id", selected.id);
        await supabase.from("gs_whatsapp_events").insert({
          conversation_id: selected.id,
          event_type: "human_assumed",
          payload: { user_id: user?.id ?? null } as any,
        });
      }
      const r = await pauseAiInN8n(selected.id, "humano assumiu");
      toast.success(r.success ? "Você assumiu a conversa" : "Assumido no painel (n8n não respondeu)");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao assumir");
    } finally {
      setBusy(false);
    }
  }

  async function handleDevolver() {
    if (!selected) return;
    setBusy(true);
    try {
      if (useReal) {
        await supabase
          .from("gs_whatsapp_conversations")
          .update({
            ai_enabled: true,
            status: "ia_respondendo",
            assigned_user_id: null,
          })
          .eq("id", selected.id);
        await supabase.from("gs_whatsapp_events").insert({
          conversation_id: selected.id,
          event_type: "returned_to_ai",
          payload: { user_id: user?.id ?? null } as any,
        });
      }
      const r = await resumeAiInN8n(selected.id);
      toast.success(r.success ? "IA reativada" : "Reativada no painel (n8n não respondeu)");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao devolver");
    } finally {
      setBusy(false);
    }
  }

  async function handleGerarRascunho() {
    if (!selected) return;
    setBusy(true);
    const r = await requestAiDraftFromN8n(selected.id);
    setBusy(false);
    if (r.success) toast.success("Rascunho solicitado ao n8n");
    else toast.error(`Falha: ${r.error ?? "n8n"}`);
  }

  async function handleEnviar() {
    if (!selected || !contact || !draft.trim()) return;
    setBusy(true);
    try {
      if (useReal) {
        await supabase.from("gs_whatsapp_messages").insert({
          conversation_id: selected.id,
          contact_id: contact.id,
          direction: "outbound",
          sender_type: "human",
          body: draft,
          message_type: "text",
        });
      }
      const r = await sendHumanMessageToN8n({
        conversation_id: selected.id,
        contact_phone: contact.phone,
        message: { body: draft, message_type: "text", audio_url: null },
        sender: {
          user_id: user?.id ?? "anon",
          name: user?.email ?? "Atendente",
        },
        control: { keep_ai_paused: true, mark_as_human_assumed: true },
      });
      if (r.success) {
        toast.success(
          r.dryRun
            ? "Mensagem aceita pelo n8n (dry_run, envio WhatsApp será ativado depois)"
            : "Mensagem enviada via n8n",
        );
        setDraft("");
      } else {
        toast.error(`Falha n8n: ${r.error ?? "desconhecido"}`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao enviar");
    } finally {
      setBusy(false);
    }
  }

  if (!selected || !contact) {
    return (
      <AppShell title="Conversas">
        <div className="p-8 text-sm text-muted-foreground">
          Nenhuma conversa ainda. Use{" "}
          <a href="/dev-webhook" className="text-primary underline">
            Dev Webhook
          </a>{" "}
          para simular um payload do n8n.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="h-[calc(100vh-0px)] grid grid-cols-[340px_1fr_340px]">
        {/* LEFT: list */}
        <div className="border-r bg-wa-panel flex flex-col min-h-0">
          <div className="p-3 border-b bg-card">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Buscar conversa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <div className="flex gap-1 mt-2 overflow-x-auto pb-1">
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap border transition ${
                    filter === f.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {list.map((c) => {
              const ct = getContact(c.contactId)!;
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left flex gap-3 px-3 py-3 border-b hover:bg-accent/40 transition ${
                    active ? "bg-accent" : "bg-card"
                  }`}
                >
                  <div className="h-10 w-10 shrink-0 rounded-full bg-muted grid place-items-center text-sm font-semibold">
                    {ct.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{ct.name}</p>
                      <span className="text-[11px] text-muted-foreground">{c.lastMessageAt}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {ct.phone} · {ct.neighborhood}
                    </p>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusLabel[c.status].className}`}>
                        {statusLabel[c.status].label}
                      </span>
                      {c.aiEnabled ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary inline-flex items-center gap-1">
                          <Bot className="h-3 w-3" /> IA
                        </span>
                      ) : c.assignedUser ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground inline-flex items-center gap-1">
                          <User className="h-3 w-3" /> {c.assignedUser}
                        </span>
                      ) : null}
                      {c.hasAudio && <Mic className="h-3 w-3 text-muted-foreground" />}
                      {c.priority === "alta" && <Badge variant="destructive" className="h-4 px-1 text-[9px]">!</Badge>}
                      {c.unread > 0 && (
                        <span className="ml-auto text-[10px] bg-primary text-primary-foreground rounded-full h-4 min-w-4 px-1 grid place-items-center">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* CENTER: conversation */}
        <div className="flex flex-col min-h-0 bg-wa-bg">
          <div className="h-14 border-b bg-card px-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-muted grid place-items-center text-xs font-semibold">
              {contact.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{contact.name}</p>
              <p className="text-xs text-muted-foreground truncate">{contact.phone}</p>
            </div>
            <Badge variant="outline" className={statusLabel[selected.status].className}>
              {statusLabel[selected.status].label}
            </Badge>
            {selected.aiEnabled || selected.needsHuman ? (
              <Button size="sm" variant="default" disabled={busy} onClick={handleAssumir}>
                <User className="h-4 w-4 mr-1" /> Assumir
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled={busy} onClick={handleDevolver}>
                <Bot className="h-4 w-4 mr-1" /> Devolver p/ IA
              </Button>
            )}
            <Button size="sm" variant="outline">
              <CheckCheck className="h-4 w-4 mr-1" /> Resolver
            </Button>
          </div>

          {selectedReal && (
            <div className="bg-card border-b px-4 py-2 text-xs flex flex-wrap items-center gap-x-4 gap-y-1">
              {selectedReal.intent && (
                <span><span className="text-muted-foreground">Intenção:</span> <strong>{selectedReal.intent}</strong></span>
              )}
              {selectedReal.funnel_stage && (
                <span><span className="text-muted-foreground">Etapa:</span> <strong>{selectedReal.funnel_stage}</strong></span>
              )}
              {typeof selectedReal.ai_confidence === "number" && (
                <span>
                  <span className="text-muted-foreground">Confiança IA:</span>{" "}
                  <strong>{Math.round(selectedReal.ai_confidence * 100)}%</strong>
                </span>
              )}
              {selectedReal.priority && (
                <span><span className="text-muted-foreground">Prioridade:</span> <strong>{selectedReal.priority}</strong></span>
              )}
              {selectedReal.last_ai_action && (
                <span className="ml-auto text-muted-foreground">
                  Última ação n8n: <strong className="text-foreground">{selectedReal.last_ai_action}</strong>
                </span>
              )}
            </div>
          )}

          {selected.needsHuman && (
            <div className="bg-warning/15 border-b px-4 py-2 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning-foreground" />
              <span className="font-medium">IA pediu humano:</span>
              <span className="text-muted-foreground">{selected.needsHumanReason}</span>
            </div>
          )}

          {selectedReal?.ai_draft_reply && (
            <div className="bg-primary/5 border-b px-4 py-2 text-sm">
              <div className="flex items-center gap-1 text-[11px] text-primary font-semibold mb-1">
                <Sparkles className="h-3 w-3" /> Rascunho gerado pela IA (não enviado)
              </div>
              <p className="text-sm">{selectedReal.ai_draft_reply}</p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" className="text-xs" onClick={() => setDraft(selectedReal.ai_draft_reply ?? "")}>
                  Usar rascunho
                </Button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {messages.map((m) => {
              if (m.senderType === "system") {
                return (
                  <div key={m.id} className="text-center">
                    <span className="inline-block text-[11px] bg-muted text-muted-foreground px-3 py-1 rounded-full">
                      {m.body}
                    </span>
                  </div>
                );
              }
              const isOut = m.direction === "outbound";
              const bubble =
                m.senderType === "ai"
                  ? "bg-primary/10 border border-primary/20"
                  : isOut
                    ? "bg-wa-bubble-out"
                    : "bg-wa-bubble-in border";
              return (
                <div key={m.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-lg px-3 py-2 shadow-sm ${bubble}`}>
                    {m.senderType === "ai" && (
                      <div className="flex items-center gap-1 text-[10px] text-primary font-medium mb-1">
                        <Bot className="h-3 w-3" /> Resposta gerada por IA
                      </div>
                    )}
                    {m.senderType === "human" && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium mb-1">
                        <User className="h-3 w-3" /> {selected.assignedUser ?? "Atendente"}
                      </div>
                    )}
                    {m.messageType === "audio" ? (
                      <div className="space-y-1.5 min-w-[220px]">
                        <div className="flex items-center gap-2">
                          <button className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center">
                            <Play className="h-4 w-4" />
                          </button>
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full w-1/3 bg-primary" />
                          </div>
                          <span className="text-[10px] text-muted-foreground">0:14</span>
                        </div>
                        {m.transcript && (
                          <p className="text-xs italic text-muted-foreground border-l-2 border-primary/40 pl-2">
                            “{m.transcript}”
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-1 text-right">{m.createdAt}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t bg-card p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                Mensagens humanas são enviadas pelo n8n → WhatsApp Cloud API.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs" disabled={busy} onClick={handleGerarRascunho}>
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> Gerar resposta com IA
                </Button>
                <Button size="sm" variant="outline" className="text-xs">
                  <CornerDownLeft className="h-3.5 w-3.5 mr-1" /> Usar rascunho da IA
                </Button>
              </div>
            </div>
            <div className="flex gap-2 items-end">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Escreva uma mensagem..."
                className="min-h-[44px] max-h-32 resize-none"
              />
              <Button size="icon" variant="outline" disabled title="Em breve: enviar áudio">
                <Mic className="h-4 w-4" />
              </Button>
              <Button size="icon" disabled={busy || !draft.trim()} onClick={handleEnviar}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* RIGHT: contact card */}
        <div className="border-l bg-card overflow-y-auto">
          <div className="p-5 border-b text-center">
            <div className="h-16 w-16 rounded-full bg-muted grid place-items-center text-lg font-semibold mx-auto">
              {contact.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </div>
            <h3 className="mt-3 font-semibold">{contact.name}</h3>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Phone className="h-3 w-3" /> {contact.phone}
            </p>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" /> {contact.city} · {contact.neighborhood}
            </p>
          </div>
          <Section title="Perfil">
            <Field label="Tipo de cliente" value={contact.customerType} />
            <Field label="Interesse principal" value={contact.interest} />
            <Field label="Etapa do funil" value={contact.stage} />
            <Field label="Responsável" value={contact.responsible ?? "·"} />
          </Section>
          <Section title="Tags">
            <div className="flex flex-wrap gap-1">
              {contact.tags.length === 0 && <span className="text-xs text-muted-foreground">Sem tags</span>}
              {contact.tags.map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px]">
                  <Tag className="h-3 w-3 mr-1" />
                  {t}
                </Badge>
              ))}
            </div>
          </Section>
          <Section title="Resumo da IA">
            <p className="text-xs text-muted-foreground leading-relaxed">{selected.aiSummary}</p>
          </Section>
          <Section title="Objeções identificadas">
            <div className="flex flex-wrap gap-1">
              {contact.objections.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma</span>}
              {contact.objections.map((o) => (
                <Badge key={o} variant="outline" className="text-[10px] border-warning text-warning-foreground">
                  {o}
                </Badge>
              ))}
            </div>
          </Section>
          <Section title="Intenção de compra">
            <Badge
              className={
                contact.intentLevel === "alta"
                  ? "bg-destructive text-destructive-foreground"
                  : contact.intentLevel === "media"
                    ? "bg-warning text-warning-foreground"
                    : "bg-muted text-muted-foreground"
              }
            >
              {contact.intentLevel}
            </Badge>
          </Section>
          <Section title="Próxima ação">
            <p className="text-xs text-muted-foreground">Confirmar metragem e agendar visita técnica.</p>
          </Section>
          <Section title="Observações">
            <p className="text-xs text-muted-foreground">{contact.notes ?? "·"}</p>
          </Section>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 border-b">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}
