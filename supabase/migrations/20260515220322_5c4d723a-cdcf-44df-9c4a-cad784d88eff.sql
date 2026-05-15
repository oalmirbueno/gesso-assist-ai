ALTER TABLE public.gs_whatsapp_conversations
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS gs_whatsapp_conv_provider_external_id_key
  ON public.gs_whatsapp_conversations (provider_instance, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gs_conv_external_id
  ON public.gs_whatsapp_conversations (external_id)
  WHERE external_id IS NOT NULL;