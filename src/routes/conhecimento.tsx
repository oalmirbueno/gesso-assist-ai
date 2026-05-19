import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/conhecimento")({
  component: Knowledge,
});

type Item = {
  id: string;
  category: string | null;
  title: string;
  content: string;
  active: boolean;
};

const SECTIONS = [
  "Produtos e serviços",
  "Perguntas frequentes",
  "Objeções e respostas",
  "Políticas comerciais",
  "Tom de voz",
  "Exemplos de bons atendimentos",
  "Correções feitas por humanos",
];

function Knowledge() {
  const [rows, setRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Item> | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("knowledge_items")
      .select("id,category,title,content,active")
      .order("category", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast.error("Falha ao carregar");
    setRows((data ?? []) as Item[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("knowledge-items")
      .on("postgres_changes", { event: "*", schema: "public", table: "knowledge_items" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function save() {
    if (!editing?.title?.trim() || !editing?.content?.trim()) {
      toast.error("Título e conteúdo obrigatórios");
      return;
    }
    const payload = {
      category: editing.category ?? null,
      title: editing.title.trim(),
      content: editing.content.trim(),
      active: editing.active ?? true,
    };
    const { error } = editing.id
      ? await supabase.from("knowledge_items").update(payload).eq("id", editing.id)
      : await supabase.from("knowledge_items").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing.id ? "Item atualizado" : "Item criado");
    setOpen(false);
    setEditing(null);
    load();
  }

  async function toggleActive(it: Item, next: boolean) {
    const { error } = await supabase.from("knowledge_items").update({ active: next }).eq("id", it.id);
    if (error) toast.error(error.message);
    else load();
  }

  async function remove(it: Item) {
    if (!confirm(`Desativar "${it.title}"? A IA deixa de consultar.`)) return;
    const { error } = await supabase.from("knowledge_items").update({ active: false }).eq("id", it.id);
    if (error) toast.error(error.message);
    else { toast.success("Item desativado"); load(); }
  }

  function openNew() {
    setEditing({ category: SECTIONS[0], title: "", content: "", active: true });
    setOpen(true);
  }

  function openEdit(it: Item) {
    setEditing(it);
    setOpen(true);
  }

  return (
    <AppShell title="Conhecimento da IA">
      <div className="p-6 space-y-6 max-w-[1300px] mx-auto">
        <Card className="p-4 border-primary/30 bg-primary/5">
          <p className="text-sm">
            <span className="font-semibold text-primary">Esta base alimenta o agente que roda no n8n.</span>{" "}
            <span className="text-muted-foreground">
              Itens ativos são consultados antes de cada resposta. Mudanças refletem nas próximas conversas.
            </span>
          </p>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {loading ? "Carregando…" : `${rows.filter((r) => r.active).length} ativos · ${rows.length} no total`}
          </p>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Novo item
          </Button>
        </div>

        {SECTIONS.map((sec) => {
          const items = rows.filter((r) => (r.category ?? "") === sec);
          return (
            <div key={sec}>
              <h2 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                {sec}
              </h2>
              {items.length === 0 ? (
                <Card className="p-4 text-sm text-muted-foreground border-dashed">
                  Nenhum item ainda.
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {items.map((it) => (
                    <Card key={it.id} className={`p-4 group ${!it.active ? "opacity-50" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{it.title}</p>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{it.content}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(it)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(it)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                        <Switch checked={it.active} onCheckedChange={(v) => toggleActive(it, v)} />
                        <span className="text-xs text-muted-foreground">
                          {it.active ? "Ativo — IA consulta" : "Inativo"}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar item" : "Novo item de conhecimento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Categoria</Label>
              <Select
                value={editing?.category ?? SECTIONS[0]}
                onValueChange={(v) => setEditing((e) => ({ ...e!, category: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título</Label>
              <Input
                value={editing?.title ?? ""}
                onChange={(e) => setEditing((s) => ({ ...s!, title: e.target.value }))}
              />
            </div>
            <div>
              <Label>Conteúdo</Label>
              <Textarea
                rows={6}
                value={editing?.content ?? ""}
                onChange={(e) => setEditing((s) => ({ ...s!, content: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
