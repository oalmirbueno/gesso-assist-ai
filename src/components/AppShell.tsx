import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";

export function AppShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {(title || actions) && (
          <header className="h-16 border-b bg-card/80 backdrop-blur flex items-center justify-between px-8">
            <div className="min-w-0">
              {title && (
                <h1 className="text-lg font-bold tracking-tight text-foreground truncate">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </header>
        )}
        <main className="flex-1 min-h-0">{children}</main>
      </div>
    </div>
  );
}
