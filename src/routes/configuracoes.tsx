import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Bot, Plug, Workflow, Info, CheckCircle2, XCircle } from "lucide-react";
import {
  getN8nConfig,
  saveN8nConfig,
  testN8nConnection,
  type N8nConfig,
} from "@/services/n8nService";
import { toast } from "sonner";

export const Route = createFileRoute("/configuracoes")({
  component: Settings,
});

function Settings() {
  const [cfg, setCfg] = useState<N8nConfig>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    setCfg(getN8nConfig());
  }, []);

  function update<K extends keyof N8nConfig>(key: K, value: string) {
    const next = { ...cfg, [key]: value };
    setCfg(next);
    saveN8nConfig(next);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const res = await testN8nConnection();
    setTestResult(res);
    setTesting(false);
    if (res.success) toast.success("Conexão n8n OK");
    else toast.error("Falha em algum webhook do n8n");
  }

  return (
    <AppShell title="Configurações">
      <div className="p-6 grid gap-4 max-w-3xl">
        <Alert className="border-primary/40 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle>A IA roda no n8n</AlertTitle>
          <AlertDescription>
            Este painel acompanha, controla e ensina o agente. As chamadas para
            OpenAI, Whisper, TTS e WhatsApp Cloud API acontecem no n8n — nunca
            no frontend.
          </AlertDescription>
        </Alert>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Agente Comercial GS Gesso (no n8n)</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Conversa naturalmente, entende contexto e áudio transcrito, qualifica
            lead, quebra objeções, pede dados de orçamento e aciona humano quando
            necessário. Nunca inventa preço, prazo ou estoque.
          </p>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <StatusRow label="Status do agente n8n" value={<Badge variant="outline">Aguardando configuração</Badge>} />
              <StatusRow label="IA ativa" value={<Badge className="bg-success/15 text-success">Ativa</Badge>} />
              <StatusRow label="Última resposta gerada" value={<span className="text-muted-foreground">—</span>} />
              <StatusRow label="Último erro" value={<span className="text-muted-foreground">—</span>} />
              <StatusRow label="Último áudio transcrito" value={<span className="text-muted-foreground">—</span>} />
              <StatusRow label="Último handoff humano" value={<span className="text-muted-foreground">—</span>} />
            </div>
            <div>
              <Label>Persona / instruções base (referência — fonte da verdade está no n8n)</Label>
              <Textarea
                rows={5}
                defaultValue={
                  "Você é o atendente comercial da GS Gesso. Fale como pessoa, simples e profissional. Não invente preço, estoque ou prazo. Para orçamento peça metragem, bairro e urgência. Acione humano em negociação, reclamação ou lead quente."
                }
              />
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <div>
                <p className="text-sm font-medium">IA ativa por padrão em novas conversas</p>
                <p className="text-xs text-muted-foreground">Pode ser desativada por conversa</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Integrações n8n</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            URLs dos webhooks que o painel chama no n8n. O segredo compartilhado
            (<code className="bg-muted px-1 rounded">N8N_PANEL_SECRET</code>) fica
            apenas no servidor — nunca no frontend.
          </p>
          <UrlField
            label="Webhook inbound (n8n → painel)"
            help="URL no painel que o n8n chama: /api/public/n8n/inbound-whatsapp"
            value={cfg.inboundUrl ?? ""}
            onChange={(v) => update("inboundUrl", v)}
            readOnlyHint
          />
          <UrlField
            label="Webhook outbound humano (painel → n8n)"
            help="Recebe mensagens humanas para enviar ao WhatsApp Cloud API"
            value={cfg.humanOutboundUrl ?? ""}
            onChange={(v) => update("humanOutboundUrl", v)}
          />
          <UrlField
            label="Webhook de controle da IA (painel → n8n)"
            help="Pause/resume da IA, pedido de rascunho"
            value={cfg.aiControlUrl ?? ""}
            onChange={(v) => update("aiControlUrl", v)}
          />
          <UrlField
            label="Webhook de aprendizado aprovado (painel → n8n)"
            help="Envia regras aprovadas pelo admin para o agente"
            value={cfg.learningUrl ?? ""}
            onChange={(v) => update("learningUrl", v)}
          />
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-muted-foreground">
              Status: {testResult ? (testResult.success ? "ok" : "com falhas") : "não testado"}
              {" · "}último evento: —
            </div>
            <Button size="sm" onClick={handleTest} disabled={testing}>
              {testing ? "Testando..." : "Testar conexão n8n"}
            </Button>
          </div>
          {testResult && (
            <div className="space-y-1 text-xs">
              {testResult.results.map((r: any) => (
                <div key={r.name} className="flex items-center gap-2 border rounded p-2">
                  {r.ok ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-destructive" />
                  )}
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted-foreground truncate">{r.url || "—"}</span>
                  <span className="ml-auto">{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Integrações externas (gerenciadas no n8n)</h2>
          </div>
          <Integration name="WhatsApp Cloud API" desc="Token e phoneNumberId vivem no n8n" />
          <Integration name="OpenAI API" desc="Modelos GPT/Whisper/TTS chamados pelo n8n" />
          <Integration name="Supabase" desc="Persistência compartilhada com o painel" />
        </Card>
      </div>
    </AppShell>
  );
}

function StatusRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border rounded-md px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs">{value}</span>
    </div>
  );
}

function UrlField({
  label,
  help,
  value,
  onChange,
  readOnlyHint,
}: {
  label: string;
  help?: string;
  value: string;
  onChange: (v: string) => void;
  readOnlyHint?: boolean;
}) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs">{label}</Label>
      <Input
        placeholder={readOnlyHint ? "https://seu-painel.lovable.app/api/public/n8n/inbound-whatsapp" : "https://n8n.exemplo.com/webhook/..."}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {help && <p className="text-[11px] text-muted-foreground">{help}</p>}
    </div>
  );
}

function Integration({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="flex items-center justify-between border rounded-md p-3">
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Badge variant="outline">via n8n</Badge>
    </div>
  );
}
