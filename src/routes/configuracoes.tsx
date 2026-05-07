import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bot, Plug, KeyRound } from "lucide-react";

export const Route = createFileRoute("/configuracoes")({
  component: Settings,
});

function Settings() {
  return (
    <AppShell title="Configurações">
      <div className="p-6 grid gap-4 max-w-3xl">
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Agente Comercial GS Gesso</h2>
          </div>
          <div className="grid gap-3">
            <div>
              <Label>Modelo OpenAI</Label>
              <Input defaultValue="gpt-4o-mini" disabled />
            </div>
            <div>
              <Label>Persona / instruções base</Label>
              <Textarea
                rows={6}
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
            <div className="flex items-center justify-between border rounded-md p-3">
              <div>
                <p className="text-sm font-medium">Transcrição automática de áudio</p>
                <p className="text-xs text-muted-foreground">Whisper (preparado)</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Integrações</h2>
          </div>
          <Integration name="WhatsApp Cloud API" status="Pendente" />
          <Integration name="n8n Webhook" status="Pendente" />
          <Integration name="OpenAI API" status="Pendente" />
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Chaves e segredos</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Conecte o Lovable Cloud para armazenar com segurança chaves do WhatsApp Cloud API, OpenAI e webhook do n8n.
          </p>
          <Button variant="outline" size="sm">Conectar Lovable Cloud</Button>
        </Card>
      </div>
    </AppShell>
  );
}

function Integration({ name, status }: { name: string; status: string }) {
  return (
    <div className="flex items-center justify-between border rounded-md p-3">
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{status}</p>
      </div>
      <Button variant="outline" size="sm">Conectar</Button>
    </div>
  );
}
