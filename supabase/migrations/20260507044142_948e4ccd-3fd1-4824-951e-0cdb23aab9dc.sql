
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS intent text,
  ADD COLUMN IF NOT EXISTS funnel_stage text,
  ADD COLUMN IF NOT EXISTS ai_confidence numeric,
  ADD COLUMN IF NOT EXISTS last_ai_action text,
  ADD COLUMN IF NOT EXISTS ai_last_decision jsonb,
  ADD COLUMN IF NOT EXISTS ai_draft_reply text;
