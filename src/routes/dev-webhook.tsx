import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { handleN8nInboundPayload } from "@/services/inboundService";
import type { N8nInboundPayload } from "@/types/domain";
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
  const [json, setJson] = useState(JSON.stringify(SAMPLE, null, 2));
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"client" | "endpoint">("client");

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const payload = JSON.parse(json) as N8nInboundPayload;
      let res: any;
      if (mode === "client") {
        res = await handleN8nInboundPayload(payload);
      } else {
        const r = await fetch("/api/n8n/inbound-whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        res = await r.json();
      }
      setResult(res);
      toast.success("Payload processado");
    } catch (e: any) {
      console.error(e);
      setResult({ success: false, error: e?.message ?? String(e) });
      toast.error(e?.message ?? "Falha ao processar payload");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="Dev Webhook Tester">
      <div className="p-6 space-y-4 max-w-5xl">
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="text-sm font-medium">Simular payload do n8n</p>
              <p className="text-xs text-muted-foreground">
                Endpoint real:{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded">
                  POST /api/n8n/inbound-whatsapp
                </code>
              </p>
            </div>
            <div className="flex gap-2">
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
                {loading ? "Enviando..." : "Disparar"}
              </Button>
            </div>
          </div>
          <Textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            className="font-mono text-xs min-h-[420px]"
          />
        </Card>

        {result && (
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                className={
                  result.success
                    ? "bg-success text-success-foreground"
                    : "bg-destructive text-destructive-foreground"
                }
              >
                {result.success ? "OK" : "ERRO"}
              </Badge>
              <span className="text-sm text-muted-foreground">Resultado</span>
            </div>
            <pre className="text-xs bg-muted p-3 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
            {result.success && (
              <p className="text-xs text-muted-foreground">
                Verifique a Inbox — a conversa deve aparecer no topo com o
                rascunho da IA e o status “precisa humano”.
              </p>
            )}
          </Card>
        )}
      </div>
    </AppShell>
  );
}
