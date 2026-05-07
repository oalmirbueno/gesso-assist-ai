import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { aiLearnings } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Sparkles } from "lucide-react";
import { sendLearningFeedbackToN8n } from "@/services/n8nService";
import { toast } from "sonner";

export const Route = createFileRoute("/aprendizados")({
  component: Learn,
});

const statusColor: Record<string, string> = {
  pendente: "bg-warning/20 text-warning-foreground",
  aprovado: "bg-success/15 text-success",
  rejeitado: "bg-destructive/15 text-destructive",
};

function Learn() {
  return (
    <AppShell title="Aprendizados da IA">
      <div className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Toda correção feita por humano vira sugestão de aprendizado. Admin aprova
          antes de virar regra ativa — e só então é enviada ao agente no n8n.
        </p>
        <div className="space-y-3">
          {aiLearnings.map((l) => (
            <Card key={l.id} className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Conversa #{l.conversationId}</span>
                  <span className="text-xs text-muted-foreground">· {l.createdAt}</span>
                </div>
                <Badge className={statusColor[l.status]}>{l.status}</Badge>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                    Resposta original da IA
                  </p>
                  <div className="text-sm bg-muted/50 rounded-md p-3 border">{l.original}</div>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                    Resposta corrigida pelo humano
                  </p>
                  <div className="text-sm bg-primary/5 rounded-md p-3 border border-primary/20">{l.edited}</div>
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                  Sugestão de aprendizado
                </p>
                <p className="text-sm">{l.suggested}</p>
                <p className="text-xs text-muted-foreground mt-1">Motivo: {l.reason}</p>
              </div>
              {l.status === "pendente" && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm"><Check className="h-4 w-4 mr-1" /> Aprovar e ensinar IA</Button>
                  <Button size="sm" variant="outline"><X className="h-4 w-4 mr-1" /> Rejeitar</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
