import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Phone, MapPin, Search, Plus, Loader2, Inbox } from "lucide-react";
import { toast } from "sonner";
import { isProductionWhatsappContact } from "@/lib/whatsappProduction";

export const Route = createFileRoute("/crm")({
  component: CRM,
});

type GsContact = {
  id: string;
  name: string | null;
  phone: string;
  city: string | null;
  neighborhood: string | null;
  interest: string | null;
  stage: string;
  tags: unknown;
  next_action: string | null;
  notes: string | null;
  updated_at: string;
  display_name?: string | null;
};

const STAGES: { id: string; label: string; accent: string }[] = [
  { id: "novo", label: "Novo", accent: "border-t-muted-foreground/40" },
  { id: "qualificado", label: "Qualificado", accent: "border-t-info" },
  { id: "orcamento", label: "Orçamento", accent: "border-t-warning" },
  { id: "negociacao", label: "Negociação", accent: "border-t-primary" },
  { id: "ganho", label: "Ganho", accent: "border-t-success" },
  { id: "perdido", label: "Perdido", accent: "border-t-destructive" },
];

function CRM() {
  const [rows, setRows] = useState<GsContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("gs_whatsapp_contacts")
      .select("id,name,display_name,phone,city,neighborhood,interest,stage,tags,next_action,notes,updated_at")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) toast.error("Falha ao carregar CRM");
    setRows(((data as GsContact[]) ?? []).filter(isProductionWhatsappContact));
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("crm-contacts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gs_whatsapp_contacts" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [r.display_name, r.name, r.phone, r.city, r.neighborhood, r.interest]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s)),
    );
  }, [rows, q]);

  const grouped = useMemo(() => {
    const map: Record<string, GsContact[]> = {};
    for (const s of STAGES) map[s.id] = [];
    for (const c of filtered) {
      const k = STAGES.find((s) => s.id === c.stage)?.id ?? "novo";
      map[k].push(c);
    }
    return map;
  }, [filtered]);

  async function moveTo(id: string, stage: string) {
    const prev = rows;
    setRows((r) => r.map((c) => (c.id === id ? { ...c, stage } : c)));
    const { error } = await supabase
      .from("gs_whatsapp_contacts")
      .update({ stage, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Não foi possível mover");
      setRows(prev);
    }
  }

  return (
    <AppShell
      title="CRM Kanban"
      subtitle="Pipeline comercial, dados reais do WhatsApp da GS Gesso"
      actions={
        <>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar nome, telefone, bairro…"
              className="pl-8 w-72"
            />
          </div>
          <Button size="sm" className="font-semibold">
            <Plus className="h-4 w-4 mr-1" /> Novo contato
          </Button>
        </>
      }
    >
      <div className="p-6 h-full overflow-x-auto overflow-y-hidden">
        {loading ? (
          <div className="h-full grid place-items-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex gap-4 h-full min-w-max pb-4">
            {STAGES.map((stage) => {
              const items = grouped[stage.id] ?? [];
              return (
                <div
                  key={stage.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggingId) {
                      moveTo(draggingId, stage.id);
                      setDraggingId(null);
                    }
                  }}
                  className="w-80 shrink-0 flex flex-col bg-muted/40 rounded-xl border"
                >
                  <div
                    className={`px-4 pt-3 pb-2 border-t-4 rounded-t-xl bg-card ${stage.accent}`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm tracking-tight">{stage.label}</h3>
                      <Badge variant="secondary" className="text-[11px]">
                        {items.length}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {items.length === 0 && (
                      <p className="text-xs text-muted-foreground/70 text-center py-6">
                        Nenhum contato
                      </p>
                    )}
                    {items.map((c) => (
                      <Card
                        key={c.id}
                        draggable
                        onDragStart={() => setDraggingId(c.id)}
                        onDragEnd={() => setDraggingId(null)}
                        className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/40 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-sm truncate">
                            {c.display_name ?? c.name ?? "Sem nome"}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3" /> {c.phone}
                        </p>
                        {(c.city || c.neighborhood) && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />{" "}
                            {[c.neighborhood, c.city].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        {c.interest && (
                          <p className="text-xs mt-2 text-foreground/80 line-clamp-2">
                            {c.interest}
                          </p>
                        )}
                        {Array.isArray(c.tags) && c.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(c.tags as string[]).slice(0, 3).map((t) => (
                              <Badge
                                key={t}
                                variant="outline"
                                className="text-[10px] py-0 px-1.5 border-primary/40 text-foreground"
                              >
                                {t}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="h-full grid place-items-center">
      <div className="text-center max-w-md">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/15 grid place-items-center mb-4">
          <Inbox className="h-7 w-7 text-primary" />
        </div>
        <h2 className="font-bold text-lg">Nenhum contato sincronizado ainda</h2>
        <p className="text-sm text-muted-foreground mt-1">
          O CRM começa a popular automaticamente quando o n8n enviar eventos reais
          do WhatsApp oficial da GS Gesso para o painel.
        </p>
      </div>
    </div>
  );
}
