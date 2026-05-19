import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

import {
  MessageSquarePlus,
  UserCheck,
  Headphones,
  CheckCircle2,
  Flame,
  Bot,
  ArrowRight,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

type Stats = {
  novas: number;
  precisaHumano: number;
  emAtendimento: number;
  resolvidasHoje: number;
  leadsQuentes: number;
  iaAtiva: number;
};

type RecentEvent = {
  id: string;
  event_type: string;
  created_at: string;
  payload: Record<string, unknown> | null;
  conversation?: {
    remote_jid?: string | null;
    contact?: {
      name?: string | null;
      display_name?: string | null;
      phone?: string | null;
    } | null;
  } | null;
};

const empty: Stats = {
  novas: 0,
  precisaHumano: 0,
  emAtendimento: 0,
  resolvidasHoje: 0,
  leadsQuentes: 0,
  iaAtiva: 0,
};

function Dashboard() {
  const [stats, setStats] = useState<Stats>(empty);
  const [events, setEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  function commit(convs: unknown[] = [], evts: RecentEvent[] = []) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    // dados reais sem filtro de teste: dashboard deve refletir o mesmo número do /whatsapp
    const list = convs as any[];
    setStats({
      novas: list.filter((c) => c.status === "nova").length,
      precisaHumano: list.filter((c) => c.needs_human).length,
      emAtendimento: list.filter((c) => c.status === "em_atendimento").length,
      resolvidasHoje: list.filter(
        (c) => c.status === "resolvida" && new Date(c.updated_at) >= todayStart,
      ).length,
      leadsQuentes: list.filter((c) => c.intent === "compra_quente" || c.needs_human).length,
      iaAtiva: list.filter((c) => c.ai_enabled).length,
    });
    setEvents(evts.slice(0, 8));
  }

  async function load() {
    setLoading(true);
    const [convs, evts] = await Promise.all([
      supabase
        .from("gs_whatsapp_conversations")
        .select("status,ai_enabled,needs_human,intent,updated_at,remote_jid,contact:gs_whatsapp_contacts(name,display_name,phone)"),
      supabase
        .from("gs_whatsapp_events")
        .select("id,event_type,created_at,payload,conversation:gs_whatsapp_conversations(remote_jid,contact:gs_whatsapp_contacts(name,display_name,phone))")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (convs.error || evts.error) console.error("dashboard load failed", convs.error ?? evts.error);
    commit((convs.data ?? []) as any[], (evts.data as RecentEvent[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("dash-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gs_whatsapp_conversations" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "gs_whatsapp_events" },
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
      supabase.removeChannel(ch);
    };
  }, []);

  const cards = [
    { label: "Conversas novas", value: stats.novas, icon: MessageSquarePlus, tone: "info" },
    { label: "Aguardando humano", value: stats.precisaHumano, icon: UserCheck, tone: "warning" },
    { label: "Em atendimento", value: stats.emAtendimento, icon: Headphones, tone: "primary" },
    { label: "Resolvidas hoje", value: stats.resolvidasHoje, icon: CheckCircle2, tone: "success" },
    { label: "Leads quentes", value: stats.leadsQuentes, icon: Flame, tone: "destructive" },
    { label: "IA ativa", value: stats.iaAtiva, icon: Bot, tone: "primary" },
  ];

  return (
    <AppShell
      title="Visão Geral"
      subtitle="Operação WhatsApp · GS Gesso · em tempo real"
      actions={
        <Button asChild className="font-semibold">
          <Link to="/whatsapp">
            <Zap className="h-4 w-4 mr-1.5" /> Abrir cockpit
          </Link>
        </Button>
      }
    >
      <div className="p-8 space-y-6 max-w-[1500px] mx-auto">
        {/* Hero brand strip */}
        <Card className="p-6 bg-foreground text-background border-foreground overflow-hidden relative">
          <div className="absolute right-0 top-0 h-full w-64 bg-primary/90 [clip-path:polygon(40%_0,100%_0,100%_100%,0_100%)]" />
          <div className="relative z-10 max-w-2xl">
            <p className="text-xs font-bold tracking-widest text-primary uppercase">
              GS Gesso · Atendimento IA
            </p>
            <h2 className="text-2xl font-bold mt-2 leading-tight">
              Sua IA atende como um vendedor humano. Você só intervém quando precisar.
            </h2>
            <p className="text-sm text-background/70 mt-2">
              O painel acompanha cada conversa em tempo real, assuma, devolva para a
              IA, treine respostas e mantenha o pipeline organizado.
            </p>
          </div>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.label} className="p-5 hover:shadow-md transition">
                <div className={`h-10 w-10 rounded-xl grid place-items-center mb-3 ${toneClass(c.tone)}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-3xl font-bold tracking-tight">
                  {loading ? "·" : c.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold">Eventos recentes</h3>
                <p className="text-xs text-muted-foreground">
                  Auditoria em tempo real do que IA, humano e n8n estão fazendo.
                </p>
              </div>
              <Link
                to="/whatsapp"
                className="text-xs font-semibold text-foreground hover:text-primary inline-flex items-center gap-1"
              >
                Ver cockpit <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">
                Nenhum evento ainda. Eventos chegam quando o n8n disparar para o painel.
              </p>
            ) : (
              <div className="space-y-1.5">
                {events.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-primary/40 transition"
                  >
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {e.event_type}
                    </Badge>
                    <p className="text-xs text-muted-foreground flex-1 truncate">
                      {previewPayload(e.payload)}
                    </p>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {new Date(e.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="font-bold mb-4">Como funciona</h3>
            <ol className="text-xs text-muted-foreground space-y-2.5 list-none">
              {[
                "Cliente chama no WhatsApp oficial da GS",
                "n8n recebe via Cloud API e monta contexto",
                "IA responde como vendedor treinado",
                "Painel mostra tudo em tempo real",
                "Humano assume quando o lead esquentar",
                "Aprovou um aprendizado? IA já usa amanhã",
              ].map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className="h-5 w-5 shrink-0 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{t}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function toneClass(tone: string) {
  switch (tone) {
    case "info":
      return "bg-info/10 text-info";
    case "warning":
      return "bg-warning/15 text-warning-foreground";
    case "success":
      return "bg-success/10 text-success";
    case "destructive":
      return "bg-destructive/10 text-destructive";
    case "primary":
      return "bg-primary/15 text-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function previewPayload(p: Record<string, unknown> | null) {
  if (!p) return "·";
  const candidate = p.reason ?? p.message ?? p.body ?? p.seller_key ?? p.intent;
  if (typeof candidate === "string") return candidate;
  return JSON.stringify(p).slice(0, 120);
}
