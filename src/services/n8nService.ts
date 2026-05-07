/**
 * n8nService — ponte do painel Lovable para o n8n.
 *
 * IMPORTANTE: O n8n é o cérebro do atendimento. Este serviço SOMENTE chama
 * o endpoint interno /api/n8n/proxy, que roda no servidor e injeta o header
 * `x-n8n-secret` (lido de N8N_PANEL_SECRET). O segredo NUNCA aparece no
 * frontend/browser.
 */
import type { HumanOutboundPayload } from "@/types/domain";

type ProxyTarget =
  | "test_connection"
  | "ai_control"
  | "human_outbound"
  | "learning_feedback";

export interface N8nCallResult {
  success: boolean;
  ok?: boolean;
  status?: number | string;
  response?: any;
  dryRun?: boolean;
  error?: string;
}

async function callN8n(target: ProxyTarget, payload: unknown): Promise<N8nCallResult> {
  try {
    const res = await fetch("/api/n8n/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, payload }),
    });
    const data = await res.json().catch(() => ({}));
    const inner = data?.response ?? {};
    const ok = !!data?.ok;
    return {
      success: ok,
      ok,
      status: data?.status ?? res.status,
      response: inner,
      dryRun: !!inner?.dry_run,
      error: ok ? undefined : inner?.error ?? data?.error ?? `HTTP ${res.status}`,
    };
  } catch (e: any) {
    return { success: false, ok: false, error: e?.message ?? "network error" };
  }
}

export async function testN8nConnection() {
  return callN8n("test_connection", {
    source: "lovable_panel",
    event: "test_connection",
    timestamp: new Date().toISOString(),
  });
}

export async function pauseAiInN8n(
  conversationId: string,
  reason: string = "human_assumed",
  userId?: string,
) {
  return callN8n("ai_control", {
    conversation_id: conversationId,
    action: "pause_ai",
    reason,
    user_id: userId,
  });
}

export async function resumeAiInN8n(conversationId: string, userId?: string) {
  return callN8n("ai_control", {
    conversation_id: conversationId,
    action: "resume_ai",
    reason: "returned_to_ai",
    user_id: userId,
  });
}

export async function requestAiDraftFromN8n(
  conversationId: string,
  payload?: Record<string, unknown>,
) {
  return callN8n("ai_control", {
    conversation_id: conversationId,
    action: "request_ai_draft",
    payload,
  });
}

export async function sendHumanMessageToN8n(payload: HumanOutboundPayload) {
  return callN8n("human_outbound", payload);
}

export async function sendLearningFeedbackToN8n(args: {
  conversationId: string;
  learningId: string;
  approved: boolean;
  approvedBy?: string;
  original?: string | null;
  edited?: string | null;
  suggestion?: string | null;
  reason?: string | null;
  category?: string | null;
}) {
  const action = args.approved ? "approve_learning" : "reject_learning";
  const payload = args.approved
    ? {
        original_ai_reply: args.original,
        human_correction: args.edited,
        lesson: args.suggestion,
        category: args.category,
      }
    : { reason: args.reason };

  return callN8n("learning_feedback", {
    conversation_id: args.conversationId,
    learning_id: args.learningId,
    action,
    approved_by: args.approvedBy,
    payload,
  });
}
