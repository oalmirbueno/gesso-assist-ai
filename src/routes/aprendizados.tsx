import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Sparkles, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sendLearningFeedbackToN8n } from "@/services/n8nService";
import { toast } from "sonner";

export const Route = createFileRoute("/aprendizados")({
  component: Learn,
});

type Learning = {
  id: string;
  conversation_id: string | null;
  original_ai_response: string | null;
  human_edited_response: string | null;
  suggested_learning: string | null;
  status: string;
  created_at: string;
};

const statusColor: Record<string, string> = {
  pendente: "bg-warning/20 text-warning-foreground",
  aprovado: "bg-success/15 text-success",
  rejeitado: "bg-destructive/15 text-destructive",
};

function Learn() {
  const [rows, setRows] = useState<Learning[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_learning_suggestions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Falha ao carregar");
    setRows((data ?? []) as Learning[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("ai-learning")
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_learning_suggestions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function saveEdit(l: Learning) {
    const { error } = await supabase
      .from("ai_learning_suggestions")
      .update({ suggested_learning: draft })
      .eq("id", l.id);
    if (error) return toast.error(error.message);
    setEditingId(null);
    toast.success("Sugestão atualizada");
    load();
  }

  async function decide(l: Learning, approved: boolean) {
    const { error } = await supabase
      .from("ai_learning_suggestions")
      .update({ status: approved ? "aprovado" : "rejeitado" })
      .eq("id", l.id);
    if (error) return toast.error(error.message);
    const r = await sendLearningFeedbackToN8n({
      learningId: l.id,
      conversationId: l.conversation_id ?? "",
      approved,
      original: l.original_ai_response,
      edited: l.human_edited_response,
      suggestion: l.suggested_learning,
    });
    toast[r.success ? "success" : "error"](
      r.success
        ? approved ? "Aprendizado enviado ao n8n" : "Aprendizado rejeitado"
        : `Falha n8n: ${r.error ?? ""}`,
    );
    load();
  }

  return (
    <AppShell title="Aprendizados da IA">
      <div className="p-6 space-y-4 max-w-[1200px] mx-auto">
        <p className="text-sm text-muted-foreground">
          Toda correção feita por humano vira sugestão. Admin edita/aprova antes de virar regra ativa no n8n.
        </p>
        {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!loading && rows.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground border-dashed">
            Nenhum aprendizado registrado ainda.
          </Card>
        )}
        <div className="space-y-3">
          {rows.map((l) => (
            <Card key={l.id} className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium font-mono">
                    {l.conversation_id?.slice(0, 8) ?? "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · {new Date(l.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <Badge className={statusColor[l.status]}>{l.status}</Badge>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                    Resposta original da IA
                  </p>
                  <div className="text-sm bg-muted/50 rounded-md p-3 border whitespace-pre-wrap">
                    {l.original_ai_response ?? "—"}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                    Correção do humano
                  </p>
                  <div className="text-sm bg-primary/5 rounded-md p-3 border border-primary/20 whitespace-pre-wrap">
                    {l.human_edited_response ?? "—"}
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                    Sugestão de aprendizado
                  </p>
                  {editingId !== l.id && l.status === "pendente" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs"
                      onClick={() => { setEditingId(l.id); setDraft(l.suggested_learning ?? ""); }}
                    >
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Button>
                  )}
                </div>
                {editingId === l.id ? (
                  <div className="space-y-2">
                    <Textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(l)}>Salvar</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm">{l.suggested_learning ?? "—"}</p>
                )}
              </div>
              {l.status === "pendente" && editingId !== l.id && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={() => decide(l, true)}>
                    <Check className="h-4 w-4 mr-1" /> Aprovar e ensinar IA
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decide(l, false)}>
                    <X className="h-4 w-4 mr-1" /> Rejeitar
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
