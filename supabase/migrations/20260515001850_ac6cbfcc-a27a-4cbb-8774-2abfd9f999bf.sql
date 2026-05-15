
-- =========================================================
-- gs_whatsapp_contacts
-- =========================================================
ALTER TABLE public.gs_whatsapp_contacts
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS responsible_user_id uuid;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gs_whatsapp_contacts_phone_key'
  ) THEN
    ALTER TABLE public.gs_whatsapp_contacts
      ADD CONSTRAINT gs_whatsapp_contacts_phone_key UNIQUE (phone);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gs_contacts_last_msg
  ON public.gs_whatsapp_contacts (last_message_at DESC);

-- =========================================================
-- gs_whatsapp_conversations
-- =========================================================
ALTER TABLE public.gs_whatsapp_conversations
  ADD COLUMN IF NOT EXISTS provider text DEFAULT 'evolution',
  ADD COLUMN IF NOT EXISTS provider_instance text DEFAULT 'gs-gesso',
  ADD COLUMN IF NOT EXISTS remote_jid text,
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid,
  ADD COLUMN IF NOT EXISTS persona_key text DEFAULT 'gs_gesso_vendedor',
  ADD COLUMN IF NOT EXISTS last_inbound_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_outbound_at timestamptz,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS raw jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gs_whatsapp_conv_provider_jid_key'
  ) THEN
    ALTER TABLE public.gs_whatsapp_conversations
      ADD CONSTRAINT gs_whatsapp_conv_provider_jid_key UNIQUE (provider_instance, remote_jid);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gs_conv_status_last_msg
  ON public.gs_whatsapp_conversations (status, last_message_at DESC);

-- =========================================================
-- gs_whatsapp_messages
-- =========================================================
ALTER TABLE public.gs_whatsapp_messages
  ADD COLUMN IF NOT EXISTS contact_id uuid,
  ADD COLUMN IF NOT EXISTS needs_human boolean,
  ADD COLUMN IF NOT EXISTS ai_reply text,
  ADD COLUMN IF NOT EXISTS seller_key text,
  ADD COLUMN IF NOT EXISTS persona_key text,
  ADD COLUMN IF NOT EXISTS media jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gs_whatsapp_messages_provider_msg_key'
  ) THEN
    ALTER TABLE public.gs_whatsapp_messages
      ADD CONSTRAINT gs_whatsapp_messages_provider_msg_key UNIQUE (provider_message_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gs_msg_conv_created
  ON public.gs_whatsapp_messages (conversation_id, created_at DESC);

-- =========================================================
-- gs_whatsapp_events
-- =========================================================
ALTER TABLE public.gs_whatsapp_events
  ADD COLUMN IF NOT EXISTS contact_id uuid;

-- =========================================================
-- gs_sellers
-- =========================================================
ALTER TABLE public.gs_sellers
  ADD COLUMN IF NOT EXISTS whatsapp_phone text,
  ADD COLUMN IF NOT EXISTS working_hours jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gs_sellers_key_key'
  ) THEN
    ALTER TABLE public.gs_sellers
      ADD CONSTRAINT gs_sellers_key_key UNIQUE (key);
  END IF;
END $$;

INSERT INTO public.gs_sellers (key, name, role, active, persona_prompt)
VALUES (
  'ia_gs',
  'IA GS Gesso',
  'atendimento_ia',
  true,
  'Atendente comercial da GS Gesso: curto, humano, consultivo, sem inventar preço/prazo/estoque.'
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  active = EXCLUDED.active,
  persona_prompt = EXCLUDED.persona_prompt,
  updated_at = now();

-- =========================================================
-- gs_availability_slots
-- =========================================================
ALTER TABLE public.gs_availability_slots
  ADD COLUMN IF NOT EXISTS seller_key text,
  ADD COLUMN IF NOT EXISTS slot_start timestamptz,
  ADD COLUMN IF NOT EXISTS slot_end timestamptz,
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS raw jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_gs_slots_start_status
  ON public.gs_availability_slots (slot_start, status);

-- =========================================================
-- gs_commercial_facts
-- =========================================================
ALTER TABLE public.gs_commercial_facts
  ADD COLUMN IF NOT EXISTS kind text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS value_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS valid_from timestamptz,
  ADD COLUMN IF NOT EXISTS valid_until timestamptz;

UPDATE public.gs_commercial_facts SET kind = fact_type WHERE kind IS NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gs_commercial_facts_kind_key_key'
  ) THEN
    ALTER TABLE public.gs_commercial_facts
      ADD CONSTRAINT gs_commercial_facts_kind_key_key UNIQUE (kind, key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gs_facts_kind_active
  ON public.gs_commercial_facts (kind, active);

INSERT INTO public.gs_commercial_facts (
  fact_type, kind, key, title, value, value_json, active, source
)
VALUES (
  'regra',
  'regra',
  'nao_inventar_preco_prazo_estoque',
  'Nunca inventar preço, prazo, estoque ou condição comercial',
  'Se não houver dado confirmado, coletar medida/bairro/material e encaminhar para conferência.',
  '{"rule":"Se não houver dado confirmado, coletar medida/bairro/material e encaminhar para conferência."}'::jsonb,
  true,
  'manual'
)
ON CONFLICT (kind, key) DO UPDATE SET
  title = EXCLUDED.title,
  value_json = EXCLUDED.value_json,
  active = true,
  updated_at = now();

-- =========================================================
-- Realtime
-- =========================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gs_whatsapp_contacts',
    'gs_whatsapp_conversations',
    'gs_whatsapp_messages',
    'gs_whatsapp_events',
    'gs_sellers',
    'gs_availability_slots',
    'gs_commercial_facts'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;
