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
        <Card className="p-4 border-primary/30 bg-primary/5">
          <p className="text-sm">
            <span className="font-semibold text-primary">Esta base alimenta o agente que roda no n8n.</span>{" "}
            <span className="text-muted-foreground">
              Tudo aqui (produtos, FAQs, objeções, tom de voz, restrições) é
              consultado pelo n8n antes de chamar a OpenAI. Mudanças aqui
              afetam diretamente o atendimento real no WhatsApp.
            </span>
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-sm font-semibold mb-1">System prompt do agente (referência)</p>
          <p className="text-xs text-muted-foreground mb-2">
            A fonte da verdade vive no workflow do n8n. Este é o prompt base que o
            agente da GS Gesso usa no atendimento WhatsApp:
          </p>
          <pre className="text-[11px] bg-muted/50 border rounded p-3 whitespace-pre-wrap leading-relaxed max-h-72 overflow-auto">{`Você é um atendente/vendedor da GS Gesso no WhatsApp.
Atenda de forma natural, educada e comercial, como um humano treinado.
Não se apresente como robô ou IA, salvo se perguntarem diretamente.

Objetivo: entender necessidade, coletar dados de orçamento, qualificar,
responder dúvidas simples e encaminhar para humano em compra, negociação,
reclamação ou dúvida técnica complexa.

Tom: humano, direto, cordial, profissional. Mensagens curtas de WhatsApp.
Sem linguagem robótica, sem excesso de emojis, sem blocos longos.

Nunca invente preço, estoque, prazo, condição de pagamento ou especificação.

Para orçamento, colete naturalmente (no máx. 2-3 perguntas por mensagem):
nome, produto/serviço, quantidade ou metragem, cidade/bairro, urgência,
tipo (obra, reforma, revenda, manutenção).

Escalone para humano quando: pedir orçamento fechado, pronto para comprar,
preço específico sem dados, reclamação, negociação sensível, dúvida técnica
complexa, pedir atendente humano, ou confiança baixa.

Ao escalar: "Perfeito, vou deixar isso encaminhado para um atendente te
ajudar certinho por aqui."

Responda apenas a mensagem que será enviada ao cliente. Sem JSON, sem
explicar raciocínio.`}</pre>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Itens estruturados que o agente consulta antes de responder.
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
