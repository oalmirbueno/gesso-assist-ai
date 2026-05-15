import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/usuarios")({
  component: UsersPage,
});

const roleColor: Record<string, string> = {
  admin: "bg-destructive/15 text-destructive",
  gestor: "bg-primary/15 text-primary",
  atendente: "bg-info/15 text-info",
};

type Row = {
  id: string;
  name: string | null;
  email: string | null;
  active: boolean;
  role: string;
};

function UsersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      supabase.from("profiles").select("id, name, email, active"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (pErr || rErr) {
      toast.error("Falha ao carregar usuários");
      setRows([]);
      setLoading(false);
      return;
    }
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

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(id: string, next: boolean) {
    const { error } = await supabase.from("profiles").update({ active: next }).eq("id", id);
    if (error) {
      toast.error("Não foi possível atualizar");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, active: next } : r)));
  }

  return (
    <AppShell title="Usuários e permissões">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Admin vê tudo. Gestor distribui conversas. Atendente vê suas conversas e as não atribuídas.
          </p>
          <Button size="sm" disabled>
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
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Carregando…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum usuário cadastrado ainda.
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{u.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge className={roleColor[u.role] ?? roleColor.atendente}>{u.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={u.active}
                        onCheckedChange={(v) => toggleActive(u.id, v)}
                      />
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
