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

const groups: { label: string; items: { to: string; label: string; icon: typeof LayoutDashboard }[] }[] = [
  {
    label: "Operação",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/whatsapp", label: "Atendimento WhatsApp", icon: MessageSquare },
      { to: "/inbox", label: "Conversas", icon: MessagesSquare },
      { to: "/crm", label: "CRM Kanban", icon: Users },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { to: "/conhecimento", label: "Conhecimento da IA", icon: BookOpen },
      { to: "/objecoes", label: "Objeções", icon: ShieldAlert },
      { to: "/aprendizados", label: "Aprendizados", icon: Sparkles },
    ],
  },
  {
    label: "Administração",
    items: [
      { to: "/usuarios", label: "Usuários", icon: UserCog },
      { to: "/configuracoes", label: "Configurações", icon: Settings },
      { to: "/dev-webhook", label: "Dev Webhook", icon: Webhook },
    ],
  },
];

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuthSession();
  const label = user?.email?.slice(0, 2).toUpperCase() ?? "GS";

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="h-16 flex items-center gap-3 px-5 border-b border-sidebar-border">
        <div className="h-10 w-10 rounded-xl bg-primary grid place-items-center text-primary-foreground font-black text-lg shadow-md">
          GS
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold tracking-wide">GS GESSO</span>
          <span className="text-[11px] text-sidebar-foreground/60 uppercase tracking-wider">
            Painel WhatsApp · IA
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              {g.label}
            </p>
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const active = it.to === "/" ? path === "/" : path.startsWith(it.to);
                const Icon = it.icon;
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{it.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border flex items-center gap-2">
        <div className="h-9 w-9 rounded-full bg-primary/20 ring-1 ring-primary/40 grid place-items-center text-xs font-bold text-primary">
          {label}
        </div>
        <div className="flex min-w-0 flex-1 flex-col leading-tight text-xs">
          <span className="truncate font-medium">{user?.email ?? "Modo teste"}</span>
          <span className="text-sidebar-foreground/50">{user ? "Autenticado" : "Sem login"}</span>
        </div>
        {user && (
          <button
            type="button"
            aria-label="Sair"
            onClick={() => supabase.auth.signOut()}
            className="grid h-8 w-8 place-items-center rounded-md text-sidebar-foreground/60 transition hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
