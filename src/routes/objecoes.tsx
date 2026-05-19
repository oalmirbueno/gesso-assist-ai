import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/objecoes")({
  component: ObjPage,
});

type Obj = {
  id: string;
  title: string;
  category: string | null;
  recommended_response: string | null;
  when_to_use: string | null;
  risk_level: string | null;
  needs_human: boolean;
  active: boolean;
  examples: any;
};

const RISK = ["baixa", "média", "alta"];
const CATS = ["preço", "comparação", "urgência", "dúvida técnica", "prazo", "qualidade", "outro"];

const riskColor: Record<string, string> = {
  baixa: "bg-success/15 text-success",
  média: "bg-warning/20 text-warning-foreground",
  alta: "bg-destructive/15 text-destructive",
};

function ObjPage() {
  const [rows, setRows] = useState<Obj[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Obj> | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("objections")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Falha ao carregar");
    setRows((data ?? []) as Obj[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("objections")
      .on("postgres_changes", { event: "*", schema: "public", table: "objections" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function save() {
    if (!editing?.title?.trim()) return toast.error("Título obrigatório");
    const payload = {
      title: editing.title.trim(),
      category: editing.category ?? null,
      recommended_response: editing.recommended_response ?? null,
      when_to_use: editing.when_to_use ?? null,
      risk_level: editing.risk_level ?? "média",
      needs_human: editing.needs_human ?? false,
      active: editing.active ?? true,
      examples: editing.examples ?? [],
    };
    const { error } = editing.id
      ? await supabase.from("objections").update(payload).eq("id", editing.id)
      : await supabase.from("objections").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing.id ? "Objeção atualizada" : "Objeção criada");
    setOpen(false);
    setEditing(null);
    load();
  }

  async function toggleActive(o: Obj, v: boolean) {
    const { error } = await supabase.from("objections").update({ active: v }).eq("id", o.id);
    if (error) toast.error(error.message);
    else load();
  }

  async function remove(o: Obj) {
    if (!confirm(`Desativar "${o.title}"?`)) return;
    await supabase.from("objections").update({ active: false }).eq("id", o.id);
    load();
  }

  return (
    <AppShell title="Objeções">
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Como a IA deve responder cada tipo de objeção. Itens ativos são enviados ao agente do n8n.
            </p>
            <p className="text-xs text-primary">
              {loading ? "Carregando…" : `${rows.filter((r) => r.active).length} ativas · ${rows.length} no total`}
            </p>
          </div>
          <Button size="sm" onClick={() => { setEditing({ active: true, risk_level: "média" }); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Nova objeção
          </Button>
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
                <th className="px-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-t align-top">
                  <td className="px-4 py-3 font-medium">{o.title}</td>
                  <td className="px-4 py-3">{o.category && <Badge variant="secondary">{o.category}</Badge>}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-sm">{o.recommended_response}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.when_to_use}</td>
                  <td className="px-4 py-3">
                    {o.risk_level && (
                      <span className={`text-xs px-2 py-0.5 rounded ${riskColor[o.risk_level] ?? ""}`}>
                        {o.risk_level}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {o.needs_human ? <Badge className="bg-warning/20 text-warning-foreground">Sim</Badge>
                                   : <Badge variant="outline">Não</Badge>}
                  </td>
                  <td className="px-4 py-3"><Switch checked={o.active} onCheckedChange={(v) => toggleActive(o, v)} /></td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(o); setOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(o)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma objeção cadastrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar objeção" : "Nova objeção"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={editing?.title ?? ""} onChange={(e) => setEditing((s) => ({ ...s!, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={editing?.category ?? ""} onValueChange={(v) => setEditing((s) => ({ ...s!, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Risco</Label>
                <Select value={editing?.risk_level ?? "média"} onValueChange={(v) => setEditing((s) => ({ ...s!, risk_level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RISK.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Resposta recomendada</Label>
              <Textarea rows={3} value={editing?.recommended_response ?? ""}
                onChange={(e) => setEditing((s) => ({ ...s!, recommended_response: e.target.value }))} />
            </div>
            <div>
              <Label>Quando usar</Label>
              <Input value={editing?.when_to_use ?? ""}
                onChange={(e) => setEditing((s) => ({ ...s!, when_to_use: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between border rounded p-2">
              <Label className="m-0">Acionar humano?</Label>
              <Switch checked={editing?.needs_human ?? false} onCheckedChange={(v) => setEditing((s) => ({ ...s!, needs_human: v }))} />
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
