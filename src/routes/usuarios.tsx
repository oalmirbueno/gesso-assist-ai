import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { users } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/usuarios")({
  component: UsersPage,
});

const roleColor: Record<string, string> = {
  admin: "bg-destructive/15 text-destructive",
  gestor: "bg-primary/15 text-primary",
  atendente: "bg-info/15 text-info",
};

function UsersPage() {
  return (
    <AppShell title="Usuários e permissões">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Admin vê tudo. Gestor distribui conversas. Atendente vê suas conversas e as não atribuídas.
          </p>
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Convidar usuário</Button>
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
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge className={roleColor[u.role]}>{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3"><Switch defaultChecked={u.active} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
