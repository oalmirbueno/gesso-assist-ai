import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {title && (
          <header className="h-14 border-b bg-card flex items-center px-6">
            <h1 className="text-base font-semibold">{title}</h1>
          </header>
        )}
        <main className="flex-1 min-h-0">{children}</main>
      </div>
    </div>
  );
}
