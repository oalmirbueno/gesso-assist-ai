import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { objections } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/objecoes")({
  component: ObjPage,
});

const riskColor: Record<string, string> = {
  baixa: "bg-success/15 text-success",
  média: "bg-warning/20 text-warning-foreground",
  alta: "bg-destructive/15 text-destructive",
};

function ObjPage() {
  return (
    <AppShell title="Objeções">
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Como a IA deve responder cada tipo de objeção. Cada item pode ser ativado/desativado.
            </p>
            <p className="text-xs text-primary">
              Estas objeções são usadas pelo agente no n8n para orientar respostas.
              Alterações aprovadas serão consideradas nas próximas conversas.
            </p>
          </div>
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova objeção</Button>
        </div>
        <div className="border rounded-lg bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Objeção</th>
                <th className="text-left px-4 py-2 font-medium">Categoria</th>
                <th className="text-left px-4 py-2 font-medium">Resposta recomendada</th>
                <th className="text-left px-4 py-2 font-medium">Quando usar</th>
                <th className="text-left px-4 py-2 font-medium">Risco</th>
                <th className="text-left px-4 py-2 font-medium">Humano?</th>
                <th className="text-left px-4 py-2 font-medium">Ativo</th>
              </tr>
            </thead>
            <tbody>
              {objections.map((o) => (
                <tr key={o.id} className="border-t align-top">
                  <td className="px-4 py-3 font-medium">{o.title}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{o.category}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-sm">{o.response}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.when}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${riskColor[o.risk]}`}>{o.risk}</span>
                  </td>
                  <td className="px-4 py-3">
                    {o.needsHuman ? (
                      <Badge className="bg-warning/20 text-warning-foreground">Sim</Badge>
                    ) : (
                      <Badge variant="outline">Não</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3"><Switch defaultChecked={o.active} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
