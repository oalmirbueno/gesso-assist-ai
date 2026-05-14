/**
 * gsGessoWhatsAppService, fachada do painel para o conector seguro.
 *
 * Toda chamada vai para o server function gsPanelCommand. O frontend NUNCA
 * conhece N8N_PANEL_SECRET nem URLs do n8n.
 */
import { gsPanelCommand } from "@/lib/gsCommand.functions";

export type GsCommandResult = Awaited<ReturnType<typeof gsPanelCommand>>;

export const gsService = {
  pauseAi: (conversation_id: string, reason?: string) =>
    gsPanelCommand({ data: { command: "pause_ai", conversation_id, reason } }),

  resumeAi: (conversation_id: string) =>
    gsPanelCommand({ data: { command: "resume_ai", conversation_id } }),

  requestDraft: (conversation_id: string) =>
    gsPanelCommand({ data: { command: "request_ai_draft", conversation_id } }),

  sendHumanMessage: (conversation_id: string, body: string) =>
    gsPanelCommand({ data: { command: "send_human_message", conversation_id, body } }),

  markResolved: (conversation_id: string) =>
    gsPanelCommand({ data: { command: "mark_resolved", conversation_id } }),

  changeSeller: (conversation_id: string, seller_key: string) =>
    gsPanelCommand({ data: { command: "change_seller", conversation_id, seller_key } }),
};

export function commandToast(r: GsCommandResult) {
  if (!r.ok) return { type: "error" as const, msg: r.error ?? "Falhou, tentar novamente" };
  if (r.pending_connector)
    return { type: "info" as const, msg: "Comando salvo no painel. Conector n8n ainda pendente." };
  return { type: "success" as const, msg: "Comando enviado ao n8n." };
}
