import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  BookOpen,
  ShieldAlert,
  Sparkles,
  UserCog,
  Settings,
  Webhook,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";

const groups: { label: string; items: { to: string; label: string; icon: typeof LayoutDashboard }[] }[] = [
  {
    label: "Operação",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/whatsapp", label: "Atendimento", icon: MessageSquare },
      { to: "/crm", label: "CRM Kanban", icon: Users },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { to: "/conhecimento", label: "Conhecimento", icon: BookOpen },
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

const STORAGE_KEY = "gs.sidebar.collapsed";

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuthSession();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const label = user?.email?.slice(0, 2).toUpperCase() ?? "GS";
  const width = collapsed ? "w-[68px]" : "w-64";

  return (
    <aside
      className={`hidden md:flex shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out ${width}`}
    >
      <div
        className={`h-16 shrink-0 flex items-center border-b border-sidebar-border ${
          collapsed ? "justify-center px-2" : "gap-3 px-3"
        }`}
      >
        {!collapsed && (
          <>
            <div className="h-10 w-10 shrink-0 rounded-xl bg-primary grid place-items-center text-primary-foreground font-black text-lg shadow-md">
              GS
            </div>
            <div className="flex flex-col leading-tight min-w-0 flex-1">
              <span className="text-sm font-bold tracking-wide truncate">GS GESSO</span>
              <span className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider truncate">
                Painel WhatsApp · IA
              </span>
            </div>
          </>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-5">
        {groups.map((g) => (
          <div key={g.label}>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                {g.label}
              </p>
            )}
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const active = it.to === "/" ? path === "/" : path.startsWith(it.to);
                const Icon = it.icon;
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    title={collapsed ? it.label : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      collapsed ? "justify-center" : ""
                    } ${
                      active
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{it.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div
        className={`p-2.5 border-t border-sidebar-border flex items-center gap-2 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <div className="h-9 w-9 shrink-0 rounded-full bg-primary/20 ring-1 ring-primary/40 grid place-items-center text-xs font-bold text-primary">
          {label}
        </div>
        {!collapsed && (
          <>
            <div className="flex min-w-0 flex-1 flex-col leading-tight text-xs">
              <span className="truncate font-medium">{user?.email ?? "Modo teste"}</span>
              <span className="text-sidebar-foreground/50">
                {user ? "Autenticado" : "Sem login"}
              </span>
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
          </>
        )}
      </div>
    </aside>
  );
}
