import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { knowledgeItems } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/conhecimento")({
  component: Knowledge,
});

const sections = [
  "Produtos e serviços",
  "Perguntas frequentes",
  "Objeções e respostas",
  "Políticas comerciais",
  "Tom de voz",
  "Exemplos de bons atendimentos",
  "Correções feitas por humanos",
];

function Knowledge() {
  return (
    <AppShell title="Conhecimento da IA">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Base usada pelo Agente Comercial GS Gesso para responder com contexto correto.
          </p>
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo item</Button>
        </div>

        {sections.map((sec) => {
          const items = knowledgeItems.filter((k) => k.category === sec);
          return (
            <div key={sec}>
              <h2 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                {sec}
              </h2>
              {items.length === 0 ? (
                <Card className="p-4 text-sm text-muted-foreground border-dashed">
                  Nenhum item ainda. Adicione conteúdo para a IA aprender.
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {items.map((it) => (
                    <Card key={it.id} className="p-4">
                      <p className="font-medium text-sm">{it.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{it.content}</p>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
