import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { contacts } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";

export const Route = createFileRoute("/crm")({
  component: CRM,
});

const stages = ["novo", "qualificado", "orcamento", "negociacao", "ganho", "perdido"];
const stageColor: Record<string, string> = {
  novo: "bg-muted text-muted-foreground",
  qualificado: "bg-info/15 text-info",
  orcamento: "bg-warning/20 text-warning-foreground",
  negociacao: "bg-primary/15 text-primary",
  ganho: "bg-success/15 text-success",
  perdido: "bg-destructive/15 text-destructive",
};

function CRM() {
  return (
    <AppShell title="CRM / Contatos">
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input placeholder="Buscar contato..." className="pl-8" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {stages.map((s) => (
              <button
                key={s}
                className={`text-xs px-2.5 py-1 rounded-full ${stageColor[s]} capitalize`}
              >
                {s}
              </button>
            ))}
          </div>
          <Button className="ml-auto" size="sm">
            <Plus className="h-4 w-4 mr-1" /> Novo contato
          </Button>
        </div>
        <div className="border rounded-lg bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Nome</th>
                <th className="text-left px-4 py-2 font-medium">Telefone</th>
                <th className="text-left px-4 py-2 font-medium">Etapa</th>
                <th className="text-left px-4 py-2 font-medium">Interesse</th>
                <th className="text-left px-4 py-2 font-medium">Responsável</th>
                <th className="text-left px-4 py-2 font-medium">Última interação</th>
                <th className="text-left px-4 py-2 font-medium">Tags</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${stageColor[c.stage]} capitalize`}>
                      {c.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.interest}</td>
                  <td className="px-4 py-3">{c.responsible ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">Hoje</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {c.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
