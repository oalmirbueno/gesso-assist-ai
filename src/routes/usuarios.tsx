import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inviteUser, changeUserRole } from "@/lib/users.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/usuarios")({
  component: UsersPage,
});

const roleColor: Record<string, string> = {
  admin: "bg-destructive/15 text-destructive",
  gestor: "bg-primary/15 text-primary",
  atendente: "bg-info/15 text-info",
};

const ROLES = ["admin", "gestor", "atendente"] as const;

type Row = {
  id: string;
  name: string | null;
  email: string | null;
  active: boolean;
  role: typeof ROLES[number];
};

function UsersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", role: "atendente" as typeof ROLES[number] });
  const [submitting, setSubmitting] = useState(false);

  const invite = useServerFn(inviteUser);
  const changeRole = useServerFn(changeUserRole);

  async function load() {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, name, email, active"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const roleMap = new Map((roles ?? []).map((r: any) => [r.user_id, r.role]));
    setRows(
      (profiles ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        active: p.active,
        role: roleMap.get(p.id) ?? "atendente",
      }))
    );
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(id: string, next: boolean) {
    const { error } = await supabase.from("profiles").update({ active: next }).eq("id", id);
    if (error) return toast.error("Não foi possível atualizar");
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, active: next } : r)));
  }

  async function setRole(userId: string, role: typeof ROLES[number]) {
    const r = await changeRole({ data: { user_id: userId, role } });
    if (!r.ok) return toast.error(r.error ?? "Falhou");
    toast.success("Função atualizada");
    load();
  }

  async function submit() {
    if (!form.email.trim()) return toast.error("Email obrigatório");
    setSubmitting(true);
    try {
      const r = await invite({ data: { email: form.email.trim(), name: form.name.trim() || undefined, role: form.role } });
      if (!r.ok) {
        toast.error(r.error ?? "Falha no convite");
      } else {
        toast.success("Convite enviado");
        setOpen(false);
        setForm({ email: "", name: "", role: "atendente" });
        load();
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Falha");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Usuários e permissões">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Admin vê tudo. Gestor distribui conversas. Atendente vê suas e as não atribuídas.
          </p>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Convidar usuário
          </Button>
        </div>
        <div className="border rounded-lg bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Nome</th>
                <th className="text-left px-4 py-2 font-medium">Email</th>
                <th className="text-left px-4 py-2 font-medium">Função</th>
                <th className="text-left px-4 py-2 font-medium">Ativo</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Carregando…
                </td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum usuário cadastrado ainda.
                </td></tr>
              )}
              {!loading && rows.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{u.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Select value={u.role} onValueChange={(v) => setRole(u.id, v as any)}>
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue>
                          <Badge className={roleColor[u.role]}>{u.role}</Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Switch checked={u.active} onCheckedChange={(v) => toggleActive(u.id, v)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Convidar usuário</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label>Nome (opcional)</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Função</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Apenas admins podem convidar. O usuário recebe email para definir senha.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Enviar convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
