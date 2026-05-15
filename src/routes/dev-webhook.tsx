import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthPanel } from "@/components/AuthPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { handleN8nInboundPayload } from "@/services/inboundService";
import type { N8nInboundPayload } from "@/types/domain";
import { useAuthSession } from "@/hooks/useAuthSession";
import { AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dev-webhook")({
  component: DevWebhook,
});

const SAMPLE: N8nInboundPayload = {
  contact: {
    phone: "5541998848435",
    name: "Almir Teste",
    source: "whatsapp_cloud_api",
    stage: "orcamento",
    tags: ["orcamento_venda"],
  },
  conversation: {
    status: "precisa_humano",
    ai_enabled: false,
    needs_human: true,
    priority: "alta",
  },
  message: {
    direction: "inbound",
    sender_type: "client",
    body: "Oi quero orçamento de drywall para minha obra",
    message_type: "text",
    provider_message_id: "wamid.TEST_FLOW_READY",
    raw: {},
  },
  ai: {
    draft_reply:
      "Perfeito. Para te passar um orçamento certo, me envie por favor: produto/serviço desejado, quantidade ou metragem, cidade/bairro e se precisa entrega. Já vou encaminhar para um vendedor.",
    mode: "handoff_human",
    reason: "lead quente",
  },
  meta: {
    phoneNumberId: "1127090593822601",
    displayPhoneNumber: "+55 41 9678-9357",
  },
};

function DevWebhook() {
  const { user, loading: authLoading, isAuthenticated } = useAuthSession();
  const [json, setJson] = useState(JSON.stringify(SAMPLE, null, 2));
  const [secret, setSecret] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"client" | "endpoint">("endpoint");

  const needsLogin = mode === "client" && !isAuthenticated;

  async function run() {
    if (needsLogin) {
      const message = "Faça login para testar o webhook";
      setResult({ success: false, error: message });
      toast.error(message);
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const payload = JSON.parse(json) as N8nInboundPayload;
      let res: any;
      if (mode === "client") {
        res = await handleN8nInboundPayload(payload);
      } else {
        const r = await fetch("/api/public/n8n/inbound-whatsapp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(secret ? { "x-n8n-secret": secret } : {}),
          },
          body: JSON.stringify(payload),
        });
        res = await r.json();
        if (r.status === 401) {
          throw new Error(res?.error ?? "x-n8n-secret inválido");
        }
      }
      setResult(res);
      if (res?.success) {
        toast.success("Payload processado com sucesso");
      } else {
        throw new Error(res?.error ?? "Falha ao processar payload");
      }
    } catch (e: any) {
      console.error(e);
      const rawMessage = e?.message ?? String(e);
      const isRls = /row-level security|RLS|42501/i.test(rawMessage);
      const message = isRls
        ? "Permissão bloqueada pelo Supabase RLS"
        : rawMessage || "Falha ao processar payload";
      setResult({ success: false, error: message, details: isRls ? rawMessage : undefined });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="Dev Webhook Tester">
      <div className="p-6 lg:p-8 space-y-6 w-full max-w-[1600px] mx-auto">
        {needsLogin && <AuthPanel />}

        <Card className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1.5 min-w-0 flex-1">
              <p className="text-base font-semibold">Simular payload do n8n</p>
              <p className="text-sm text-muted-foreground">
                Endpoint real:{" "}
                <code className="bg-muted px-2 py-1 rounded text-xs break-all">
                  POST /api/public/n8n/inbound-whatsapp
                </code>
              </p>
              <p className="text-sm text-muted-foreground">
                {isAuthenticated
                  ? `Logado como ${user?.email}`
                  : "Faça login para testar via service. O endpoint /api/public roda no backend."}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap shrink-0">
              <Button
                size="sm"
                variant={mode === "client" ? "default" : "outline"}
                onClick={() => setMode("client")}
              >
                Via service (RLS)
              </Button>
              <Button
                size="sm"
                variant={mode === "endpoint" ? "default" : "outline"}
                onClick={() => setMode("endpoint")}
              >
                Via endpoint /api
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setJson(JSON.stringify(SAMPLE, null, 2))}
              >
                Resetar payload
              </Button>
              <Button size="sm" onClick={run} disabled={loading}>
                {loading ? "Enviando..." : authLoading ? "Verificando..." : "Disparar"}
              </Button>
            </div>
          </div>
          {needsLogin && (
            <Alert className="border-warning/40 bg-warning/10">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Faça login para testar o webhook</AlertTitle>
              <AlertDescription>
                O botão “Via service (RLS)” usa as permissões do usuário autenticado.
              </AlertDescription>
            </Alert>
          )}
          {mode === "endpoint" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                x-n8n-secret (header)
              </label>
              <Input
                type="password"
                placeholder="Cole o segredo compartilhado N8N_PANEL_SECRET"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Em produção o endpoint só aceita requisições com este header válido.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Payload JSON
            </label>
            <Textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              className="font-mono text-xs min-h-[520px] leading-relaxed"
            />
          </div>
        </Card>

        {result && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-destructive" />
              )}
              <Badge
                className={
                  result.success
                    ? "bg-success text-success-foreground"
                    : "bg-destructive text-destructive-foreground"
                }
              >
                {result.success ? "OK" : "ERRO"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {result.success ? "Payload processado com sucesso" : result.error}
              </span>
            </div>
            <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-[480px] leading-relaxed">
              {JSON.stringify(result, null, 2)}
            </pre>
            {result.success && (
              <p className="text-xs text-muted-foreground">
                Verifique a Inbox — a conversa deve aparecer no topo com o rascunho da IA e o status “precisa humano”.
              </p>
            )}
          </Card>
        )}
      </div>
    </AppShell>
  );
}
