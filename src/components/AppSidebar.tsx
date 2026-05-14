import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  MessagesSquare,
  MessageSquare,
  Users,
  BookOpen,
  ShieldAlert,
  Sparkles,
  UserCog,
  Settings,
  Webhook,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/whatsapp", label: "Atendimento WhatsApp", icon: MessageSquare },
  { to: "/inbox", label: "Conversas", icon: MessagesSquare },
  { to: "/crm", label: "CRM / Contatos", icon: Users },
  { to: "/conhecimento", label: "Conhecimento da IA", icon: BookOpen },
  { to: "/objecoes", label: "Objeções", icon: ShieldAlert },
  { to: "/aprendizados", label: "Aprendizados da IA", icon: Sparkles },
  { to: "/usuarios", label: "Usuários", icon: UserCog },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
  { to: "/dev-webhook", label: "Dev Webhook", icon: Webhook },
];

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuthSession();
  const label = user?.email?.slice(0, 2).toUpperCase() ?? "GS";

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-card">
      <div className="h-14 flex items-center gap-2 px-4 border-b">
        <div className="h-8 w-8 rounded-lg bg-primary grid place-items-center text-primary-foreground font-bold">
          GS
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">GS Gesso</span>
          <span className="text-[11px] text-muted-foreground">Atendimento IA</span>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {items.map((it) => {
          const active = it.to === "/" ? path === "/" : path.startsWith(it.to);
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-muted grid place-items-center text-xs font-semibold">
          {label}
        </div>
        <div className="flex min-w-0 flex-1 flex-col leading-tight text-xs">
          <span className="truncate font-medium">{user?.email ?? "Modo teste"}</span>
          <span className="text-muted-foreground">{user ? "Autenticado" : "Sem login"}</span>
        </div>
        {user && (
          <button
            type="button"
            aria-label="Sair"
            onClick={() => supabase.auth.signOut()}
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
