// Domain types for GS Gesso Atendimento IA
// Mirrors Supabase tables (snake_case) so service responses map directly.

export type ConvStatus =
  | "nova"
  | "ia_respondendo"
  | "precisa_humano"
  | "em_atendimento"
  | "aguardando_cliente"
  | "resolvida";

export type SenderType = "client" | "ai" | "human" | "system";
export type Direction = "inbound" | "outbound";
export type MessageType = "text" | "audio" | "image" | "document";
export type Priority = "baixa" | "normal" | "media" | "alta";
export type AppRole = "admin" | "gestor" | "atendente";

export interface Contact {
  id: string;
  name: string | null;
  phone: string;
  city: string | null;
  neighborhood: string | null;
  customer_type: string | null;
  source: string | null;
  stage: string;
  tags: string[];
  notes: string | null;
  responsible_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  contact_id: string;
  status: ConvStatus | string;
  assigned_user_id: string | null;
  ai_enabled: boolean;
  needs_human: boolean;
  needs_human_reason: string | null;
  priority: Priority | string;
  last_message_at: string | null;
  ai_summary: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  direction: Direction;
  sender_type: SenderType;
  body: string | null;
  message_type: MessageType | string;
  audio_url: string | null;
  transcript: string | null;
  provider_message_id: string | null;
  raw: Record<string, unknown> | null;
  created_at: string;
}

export interface ConversationEvent {
  id: string;
  conversation_id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface Objection {
  id: string;
  title: string;
  category: string | null;
  recommended_response: string | null;
  when_to_use: string | null;
  risk_level: string | null;
  needs_human: boolean;
  examples: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeItem {
  id: string;
  category: string | null;
  title: string;
  content: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiLearningSuggestion {
  id: string;
  conversation_id: string | null;
  original_ai_response: string | null;
  human_edited_response: string | null;
  suggested_learning: string | null;
  status: "pendente" | "aprovado" | "rejeitado" | string;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

// ===== n8n inbound payload =====
export interface N8nInboundPayload {
  contact: {
    phone: string;
    name?: string;
    source?: string;
    stage?: string;
    tags?: string[];
    city?: string;
    neighborhood?: string;
    customer_type?: string;
  };
  conversation?: {
    status?: ConvStatus | string;
    ai_enabled?: boolean;
    needs_human?: boolean;
    needs_human_reason?: string;
    priority?: Priority | string;
  };
  message: {
    direction: Direction;
    sender_type: SenderType;
    body?: string;
    message_type?: MessageType | string;
    audio_url?: string;
    transcript?: string;
    provider_message_id?: string;
    raw?: Record<string, unknown>;
  };
  ai?: {
    draft_reply?: string;
    mode?: string;
    reason?: string;
    summary?: string;
  };
  meta?: Record<string, unknown>;
}

export interface InboundResult {
  success: boolean;
  contact_id: string;
  conversation_id: string;
  message_id: string;
  error?: string;
}
