
-- ================== ROLES ==================
create type public.app_role as enum ('admin', 'gestor', 'atendente');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null default 'atendente',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  )
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('admin','gestor')
  )
$$;

-- ================== CONTACTS ==================
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text,
  phone text not null unique,
  city text,
  neighborhood text,
  customer_type text,
  source text default 'whatsapp_cloud_api',
  stage text default 'novo',
  tags jsonb not null default '[]'::jsonb,
  notes text,
  responsible_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ================== CONVERSATIONS ==================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  status text not null default 'nova',
  assigned_user_id uuid references auth.users(id) on delete set null,
  ai_enabled boolean not null default true,
  needs_human boolean not null default false,
  needs_human_reason text,
  priority text not null default 'normal',
  last_message_at timestamptz,
  ai_summary text,
  unread_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_contact_idx on public.conversations(contact_id);
create index conversations_status_idx on public.conversations(status);

-- ================== MESSAGES ==================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  direction text not null,
  sender_type text not null,
  body text,
  message_type text not null default 'text',
  audio_url text,
  transcript text,
  provider_message_id text,
  raw jsonb,
  created_at timestamptz not null default now()
);
create index messages_conv_idx on public.messages(conversation_id, created_at);

-- ================== CONVERSATION EVENTS ==================
create table public.conversation_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index conversation_events_conv_idx on public.conversation_events(conversation_id, created_at);

-- ================== OBJECTIONS ==================
create table public.objections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  recommended_response text,
  when_to_use text,
  risk_level text,
  needs_human boolean not null default false,
  examples jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ================== KNOWLEDGE ITEMS ==================
create table public.knowledge_items (
  id uuid primary key default gen_random_uuid(),
  category text,
  title text not null,
  content text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ================== AI LEARNING SUGGESTIONS ==================
create table public.ai_learning_suggestions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete set null,
  original_ai_response text,
  human_edited_response text,
  suggested_learning text,
  status text not null default 'pendente',
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ================== updated_at trigger ==================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger t_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger t_contacts_updated before update on public.contacts for each row execute function public.set_updated_at();
create trigger t_conversations_updated before update on public.conversations for each row execute function public.set_updated_at();
create trigger t_objections_updated before update on public.objections for each row execute function public.set_updated_at();
create trigger t_knowledge_updated before update on public.knowledge_items for each row execute function public.set_updated_at();
create trigger t_aisugg_updated before update on public.ai_learning_suggestions for each row execute function public.set_updated_at();

-- profile auto-create on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), new.email)
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'atendente')
  on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ================== RLS ==================
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_events enable row level security;
alter table public.objections enable row level security;
alter table public.knowledge_items enable row level security;
alter table public.ai_learning_suggestions enable row level security;

-- profiles
create policy "profiles self read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff(auth.uid()));
create policy "profiles self update" on public.profiles for update to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- user_roles: only admins manage; users can read own
create policy "roles read own" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "roles admin manage" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- operational tables: any authenticated user
create policy "contacts auth all" on public.contacts for all to authenticated using (true) with check (true);
create policy "conversations auth all" on public.conversations for all to authenticated using (true) with check (true);
create policy "messages auth all" on public.messages for all to authenticated using (true) with check (true);
create policy "events auth all" on public.conversation_events for all to authenticated using (true) with check (true);

-- knowledge / objections: read all auth, write staff only
create policy "objections read" on public.objections for select to authenticated using (true);
create policy "objections write staff" on public.objections for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create policy "knowledge read" on public.knowledge_items for select to authenticated using (true);
create policy "knowledge write staff" on public.knowledge_items for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- ai_learning_suggestions: read all auth, approve = staff
create policy "ai_learn read" on public.ai_learning_suggestions for select to authenticated using (true);
create policy "ai_learn insert auth" on public.ai_learning_suggestions for insert to authenticated with check (true);
create policy "ai_learn update staff" on public.ai_learning_suggestions for update to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- ================== REALTIME ==================
alter table public.conversations replica identity full;
alter table public.messages replica identity full;
alter table public.conversation_events replica identity full;

alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversation_events;
