/**
 * n8nService — ponte do painel Lovable para o n8n.
 *
 * IMPORTANTE: O n8n é o cérebro do atendimento. Este serviço apenas envia
 * eventos / pedidos para o n8n. A lógica de OpenAI, WhatsApp Cloud API,
 * transcrição (Whisper) e TTS roda toda no n8n.
 *
 * As URLs ficam configuráveis (localStorage no MVP). Em produção devem ir
 * para uma tabela `integrations` ou variáveis de ambiente do servidor.
 */
import type {
  AiControlAction,
  AiControlPayload,
  HumanOutboundPayload,
} from "@/types/domain";

const STORAGE_KEY = "gs.n8n.config";

export interface N8nConfig {
  inboundUrl?: string; // n8n -> painel (informativo)
  humanOutboundUrl?: string; // painel -> n8n (mensagem humana)
  aiControlUrl?: string; // painel -> n8n (pause/resume/draft)
  learningUrl?: string; // painel -> n8n (aprendizado aprovado)
}

export function getN8nConfig(): N8nConfig {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as N8nConfig;
  } catch {
    return {};
  }
}

export function saveN8nConfig(cfg: N8nConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

async function postIfConfigured(url: string | undefined, body: unknown) {
  if (!url) {
    return {
      success: true,
      mocked: true,
      reason: "URL do n8n não configurada — operação registrada apenas no painel.",
    } as const;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }
    if (!res.ok) {
      return { success: false, status: res.status, error: json?.error ?? text } as const;
    }
    return { success: true, response: json } as const;
  } catch (e: any) {
    return { success: false, error: e?.message ?? "network error" } as const;
  }
}

export async function sendHumanMessageToN8n(payload: HumanOutboundPayload) {
  const cfg = getN8nConfig();
  return postIfConfigured(cfg.humanOutboundUrl, payload);
}

function controlPayload(
  conversationId: string,
  action: AiControlAction,
  reason?: string,
  extra?: Record<string, unknown>,
): AiControlPayload {
  return {
    conversation_id: conversationId,
    action,
    reason,
    payload: extra,
  };
}

export async function pauseAiInN8n(conversationId: string, reason?: string) {
  const cfg = getN8nConfig();
  return postIfConfigured(cfg.aiControlUrl, controlPayload(conversationId, "pause_ai", reason));
}

export async function resumeAiInN8n(conversationId: string) {
  const cfg = getN8nConfig();
  return postIfConfigured(cfg.aiControlUrl, controlPayload(conversationId, "resume_ai"));
}

export async function requestAiDraftFromN8n(conversationId: string) {
  const cfg = getN8nConfig();
  return postIfConfigured(cfg.aiControlUrl, controlPayload(conversationId, "request_ai_draft"));
}

export async function sendLearningFeedbackToN8n(args: {
  conversationId?: string | null;
  learningId: string;
  approved: boolean;
  original?: string | null;
  edited?: string | null;
  suggestion?: string | null;
}) {
  const cfg = getN8nConfig();
  return postIfConfigured(
    cfg.learningUrl,
    controlPayload(
      args.conversationId ?? "",
      args.approved ? "approve_learning" : "reject_learning",
      undefined,
      {
        learning_id: args.learningId,
        original: args.original,
        edited: args.edited,
        suggestion: args.suggestion,
      },
    ),
  );
}

export async function testN8nConnection() {
  const cfg = getN8nConfig();
  const targets = [
    { name: "humanOutboundUrl", url: cfg.humanOutboundUrl },
    { name: "aiControlUrl", url: cfg.aiControlUrl },
    { name: "learningUrl", url: cfg.learningUrl },
  ];
  const results = await Promise.all(
    targets.map(async (t) => {
      if (!t.url) return { ...t, ok: false, status: "não configurado" };
      try {
        const res = await fetch(t.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ping: true, from: "lovable_panel" }),
        });
        return { ...t, ok: res.ok, status: `${res.status}` };
      } catch (e: any) {
        return { ...t, ok: false, status: e?.message ?? "erro" };
      }
    }),
  );
  return { success: results.every((r) => r.ok || r.status === "não configurado"), results };
}
