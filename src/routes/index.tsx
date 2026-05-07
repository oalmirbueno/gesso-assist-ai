import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquarePlus,
  UserCheck,
  Headphones,
  CheckCircle2,
  Flame,
  Clock,
  HelpCircle,
  Mic,
  AlertTriangle,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

const cards = [
  { label: "Conversas novas", value: 8, icon: MessageSquarePlus, tone: "info" },
  { label: "Aguardando humano", value: 3, icon: UserCheck, tone: "warning" },
  { label: "Em atendimento", value: 5, icon: Headphones, tone: "primary" },
  { label: "Resolvidas hoje", value: 14, icon: CheckCircle2, tone: "success" },
  { label: "Leads quentes", value: 6, icon: Flame, tone: "destructive" },
  { label: "Tempo médio s/ resposta", value: "4m32s", icon: Clock, tone: "muted" },
  { label: "IA pediu ajuda", value: 2, icon: HelpCircle, tone: "warning" },
];

const alerts = [
  { type: "IA pediu humano", text: "Marcos Almeida — lead quente, pedido de fechamento", time: "10:42", tone: "warning" as const },
  { type: "Áudio aguardando", text: "Larissa Souto enviou áudio — transcrição pendente", time: "10:55", tone: "info" as const },
  { type: "Sem resposta", text: "Construtora Ferraz aguardando há 12 min", time: "10:50", tone: "destructive" as const },
  { type: "Reclamação", text: "Cliente João reportou atraso na entrega", time: "09:20", tone: "destructive" as const },
];

function toneClass(tone: string) {
  switch (tone) {
    case "info": return "bg-info/10 text-info";
    case "warning": return "bg-warning/15 text-warning-foreground";
    case "success": return "bg-success/10 text-success";
    case "destructive": return "bg-destructive/10 text-destructive";
    case "primary": return "bg-primary/10 text-primary";
    default: return "bg-muted text-muted-foreground";
  }
}

function Dashboard() {
  return (
    <AppShell title="Dashboard">
      <div className="p-6 space-y-6">
        <Card className="p-4 border-primary/30 bg-primary/5 space-y-2">
          <p className="text-sm">
            <span className="font-semibold text-primary">Como funciona o atendimento.</span>{" "}
            <span className="text-muted-foreground">
              Quando um cliente chama a GS Gesso no WhatsApp, o n8n recebe a mensagem,
              consulta histórico e base de conhecimento, chama a OpenAI e responde
              automaticamente como um vendedor humano treinado. Este painel serve para{" "}
              <strong>acompanhar, corrigir, assumir conversas e ensinar a IA</strong> —
              ele não fala com o WhatsApp nem com a OpenAI diretamente.
            </span>
          </p>
          <ol className="text-xs text-muted-foreground list-decimal pl-5 space-y-0.5">
            <li>Cliente envia mensagem no WhatsApp oficial.</li>
            <li>WhatsApp Cloud API → webhook do n8n.</li>
            <li>n8n monta contexto (histórico, contato, funil, base, objeções).</li>
            <li>n8n chama OpenAI com o agente da GS Gesso e decide a resposta.</li>
            <li>Se for seguro, n8n responde no WhatsApp; senão pede humano aqui.</li>
            <li>Painel mostra tudo em tempo real e permite assumir/devolver.</li>
          </ol>
        </Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.label} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className="text-2xl font-semibold mt-1">{c.value}</p>
                  </div>
                  <div className={`h-9 w-9 rounded-lg grid place-items-center ${toneClass(c.tone)}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Alertas em tempo real</h2>
              <Link to="/inbox" className="text-xs text-primary hover:underline">Abrir conversas →</Link>
            </div>
            <div className="space-y-2">
              {alerts.map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-md border bg-card">
                  <div className={`h-8 w-8 rounded-md grid place-items-center ${toneClass(a.tone)}`}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.type}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.text}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{a.time}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold mb-4">Saúde da IA</h2>
            <div className="space-y-3 text-sm">
              <Row label="Conversas com IA ativa" value="12" />
              <Row label="Confiança média" value="86%" />
              <Row label="Handoffs hoje" value="4" />
              <Row label="Aprendizados pendentes" value={<Badge variant="secondary">2</Badge>} />
              <Row label="Áudios transcritos" value="9 / 11" />
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
