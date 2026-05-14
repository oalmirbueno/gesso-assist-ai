-- ============ GS GESSO MODULE ============

create table if not exists public.gs_whatsapp_contacts (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  name text,
  city text,
  neighborhood text,
  interest text,
  stage text not null default 'novo',
  responsible_seller_id uuid,
  next_action text,
  notes text,
  tags jsonb not null default '[]',
  source text default 'whatsapp_evolution',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gs_sellers (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  role text not null default 'atendimento_humano',
  active boolean not null default true,
  persona_prompt text,
  schedule jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gs_whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.gs_whatsapp_contacts(id) on delete cascade,
  status text not null default 'nova',
  ai_enabled boolean not null default true,
  needs_human boolean not null default false,
  needs_human_reason text,
  current_seller_id uuid references public.gs_sellers(id),
  intent text,
  funnel_stage text,
  ai_confidence numeric,
  last_ai_action text,
  ai_draft_reply text,
  ai_last_decision jsonb,
  unread_count integer not null default 0,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gs_whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.gs_whatsapp_conversations(id) on delete cascade,
  direction text not null,
  sender_type text not null,
  message_type text not null default 'text',
  body text,
  audio_url text,
  transcript text,
  intent text,
  confidence numeric,
  provider_message_id text,
  raw jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.gs_whatsapp_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.gs_whatsapp_conversations(id) on delete cascade,
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.gs_availability_slots (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.gs_sellers(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'livre',
  source text not null default 'manual',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gs_commercial_facts (
  id uuid primary key default gen_random_uuid(),
  fact_type text not null,
  key text not null,
  value text not null,
  metadata jsonb not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_gs_conv_last_msg on public.gs_whatsapp_conversations(last_message_at desc nulls last);
create index if not exists idx_gs_msg_conv on public.gs_whatsapp_messages(conversation_id, created_at);
create index if not exists idx_gs_conv_contact on public.gs_whatsapp_conversations(contact_id);
create index if not exists idx_gs_facts_type on public.gs_commercial_facts(fact_type);
create index if not exists idx_gs_slots_starts on public.gs_availability_slots(starts_at);

-- Triggers updated_at
create trigger gs_contacts_updated before update on public.gs_whatsapp_contacts for each row execute function public.set_updated_at();
create trigger gs_sellers_updated before update on public.gs_sellers for each row execute function public.set_updated_at();
create trigger gs_convs_updated before update on public.gs_whatsapp_conversations for each row execute function public.set_updated_at();
create trigger gs_slots_updated before update on public.gs_availability_slots for each row execute function public.set_updated_at();
create trigger gs_facts_updated before update on public.gs_commercial_facts for each row execute function public.set_updated_at();

-- RLS
alter table public.gs_whatsapp_contacts enable row level security;
alter table public.gs_whatsapp_conversations enable row level security;
alter table public.gs_whatsapp_messages enable row level security;
alter table public.gs_whatsapp_events enable row level security;
alter table public.gs_sellers enable row level security;
alter table public.gs_availability_slots enable row level security;
alter table public.gs_commercial_facts enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array[
    'gs_whatsapp_contacts','gs_whatsapp_conversations','gs_whatsapp_messages',
    'gs_whatsapp_events','gs_sellers','gs_availability_slots','gs_commercial_facts'
  ])
  loop
    execute format('create policy %I on public.%I for select to authenticated using (true)', t||'_sel', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (true)', t||'_ins', t);
    execute format('create policy %I on public.%I for update to authenticated using (true) with check (true)', t||'_upd', t);
  end loop;
end $$;

-- Realtime
alter publication supabase_realtime add table public.gs_whatsapp_conversations;
alter publication supabase_realtime add table public.gs_whatsapp_messages;
alter publication supabase_realtime add table public.gs_whatsapp_contacts;
alter publication supabase_realtime add table public.gs_whatsapp_events;

-- Persona padrão
insert into public.gs_sellers (key, name, role, active, persona_prompt)
values ('ia_gs','IA GS Gesso','atendimento_ia', true,
  'Você é a IA da GS Gesso. Atende WhatsApp como vendedor humano experiente: pergunta metragem, bairro e prazo antes de qualquer preço. Nunca inventa valor, prazo ou estoque. Se cliente demonstrar compra quente, sinaliza precisa humano.')
on conflict (key) do nothing;
