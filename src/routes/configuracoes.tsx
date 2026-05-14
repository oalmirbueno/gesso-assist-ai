import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Plug,
  Workflow,
  Info,
  CheckCircle2,
  XCircle,
  ShieldCheck,
} from "lucide-react";
import { testN8nConnection } from "@/services/n8nService";
import { toast } from "sonner";

export const Route = createFileRoute("/configuracoes")({
  component: Settings,
});

const N8N_ENDPOINTS = [
  { name: "Teste de conexão", path: "gs-gesso-panel-test" },
  { name: "Controle da IA", path: "gs-gesso-ai-control" },
  { name: "Mensagem humana outbound", path: "gs-gesso-human-outbound" },
  { name: "Aprendizado aprovado/rejeitado", path: "gs-gesso-learning-feedback" },
  { name: "Inbound n8n → painel", path: "gs-gesso-inbound-to-panel" },
];

function Settings() {
  const [testing, setTesting] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  async function handleTest() {
    setTesting(true);
    setLastError(null);
    const res = await testN8nConnection();
    setLastResult(res);
    setTesting(false);
    if (res.success) {
      toast.success("Conexão n8n OK");
    } else {
      setLastError(res.error ?? "Falha desconhecida");
      toast.error(`Falha n8n: ${res.error ?? "desconhecido"}`);
    }
  }

  return (
    <AppShell title="Configurações">
      <div className="p-6 grid gap-4 max-w-3xl">
        <Alert className="border-primary/40 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle>O n8n é o cérebro da IA</AlertTitle>
          <AlertDescription>
            Este painel é apenas o cockpit operacional. As chamadas para OpenAI,
            Whisper, TTS e WhatsApp Cloud API acontecem no n8n. Toda
            comunicação painel ↔ n8n passa por um proxy server-side autenticado
            por <code className="bg-muted px-1 rounded">N8N_PANEL_SECRET</code>.
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
          <div>
            <Label>Persona / instruções base (referência, fonte da verdade está no n8n)</Label>
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
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Integrações n8n</h2>
            <Badge variant="outline" className="ml-auto inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> server-side
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Webhooks reais já configurados no servidor. O segredo
            <code className="bg-muted px-1 rounded mx-1">N8N_PANEL_SECRET</code>
            é injetado no header <code className="bg-muted px-1 rounded">x-n8n-secret</code>
            apenas no backend, nunca exposto ao browser.
          </p>
          <div className="grid gap-1.5">
            {N8N_ENDPOINTS.map((ep) => (
              <div
                key={ep.path}
                className="flex items-center justify-between border rounded-md px-3 py-2 text-xs"
              >
                <span className="font-medium">{ep.name}</span>
                <code className="text-muted-foreground truncate">
                  /webhook/{ep.path}
                </code>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-muted-foreground">
              Status:{" "}
              {lastResult
                ? lastResult.success
                  ? "ok"
                  : "com falhas"
                : "não testado"}
            </div>
            <Button size="sm" onClick={handleTest} disabled={testing}>
              {testing ? "Testando..." : "Testar conexão n8n"}
            </Button>
          </div>

          {lastResult && (
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 border rounded p-2">
                {lastResult.success ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                )}
                <span className="font-medium">Última resposta</span>
                <span className="ml-auto text-muted-foreground">
                  HTTP {lastResult.status ?? "·"}
                </span>
              </div>
              <pre className="bg-muted/50 border rounded p-2 overflow-auto text-[11px]">
                {JSON.stringify(lastResult.response, null, 2)}
              </pre>
              {lastResult.dryRun && (
                <Alert className="border-warning/40 bg-warning/10">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Integração validada. Envio real do WhatsApp ainda será
                    ativado no n8n (dry_run).
                  </AlertDescription>
                </Alert>
              )}
              {lastError && (
                <p className="text-destructive">Último erro: {lastError}</p>
              )}
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
