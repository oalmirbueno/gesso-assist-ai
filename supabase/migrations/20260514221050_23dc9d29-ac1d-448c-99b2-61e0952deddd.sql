ALTER TABLE public.gs_whatsapp_messages
  ADD COLUMN IF NOT EXISTS provider_status text;

ALTER TABLE public.gs_whatsapp_conversations
  ADD COLUMN IF NOT EXISTS current_seller_key text;

CREATE INDEX IF NOT EXISTS gs_whatsapp_messages_conv_created_idx
  ON public.gs_whatsapp_messages (conversation_id, created_at DESC);