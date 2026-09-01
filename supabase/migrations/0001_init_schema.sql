-- ============================================================================
-- Project Knowledge Platform — Initial Schema
-- Requires: pgvector extension (Supabase has this available by default)
-- ============================================================================

create extension if not exists vector;
create extension if not exists pgcrypto; -- for gen_random_uuid()

-- ----------------------------------------------------------------------------
-- profiles: 1:1 with auth.users, carries role + display info
-- ----------------------------------------------------------------------------
create type user_role as enum ('admin', 'developer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role user_role not null default 'developer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Extends auth.users with app-level role and profile info.';

-- Auto-create a profile row whenever a new auth user signs up.
-- New users default to 'developer'; promote to 'admin' manually via SQL or an admin UI action.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- projects
-- ----------------------------------------------------------------------------
create type project_status as enum ('active', 'archived');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status project_status not null default 'active',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- project_access: which developers can see which projects
-- ----------------------------------------------------------------------------
create table public.project_access (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  granted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

-- ----------------------------------------------------------------------------
-- documents: uploaded source material (transcripts, images, manual notes)
-- ----------------------------------------------------------------------------
create type document_source_type as enum ('fathom', 'fireflies', 'tldv', 'manual', 'image');
create type document_status as enum ('pending', 'parsing', 'parsed', 'embedding', 'embedded', 'failed');

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_type document_source_type not null,
  original_filename text,
  storage_path text, -- null for pure manual-paste (no file), else path in Storage bucket
  raw_text text, -- for manual paste, or extracted plain text prior to chunking
  status document_status not null default 'pending',
  error_message text,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_documents_project on public.documents(project_id);
create index idx_documents_status on public.documents(status);

-- ----------------------------------------------------------------------------
-- document_chunks: embedded chunks used for retrieval
-- ----------------------------------------------------------------------------
create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade, -- denormalized for fast RLS + scoped search
  chunk_index int not null,
  content text not null,
  embedding vector(1536), -- text-embedding-3-small dimension
  metadata jsonb not null default '{}'::jsonb, -- e.g. {speaker, start_ts, end_ts, page}
  created_at timestamptz not null default now()
);

create index idx_chunks_project on public.document_chunks(project_id);
create index idx_chunks_document on public.document_chunks(document_id);

-- ivfflat index for cosine similarity search (requires ANALYZE after bulk insert)
create index idx_chunks_embedding on public.document_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ----------------------------------------------------------------------------
-- qa_history: developer Q&A log per project
-- ----------------------------------------------------------------------------
create table public.qa_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  question text not null,
  answer text not null,
  sources jsonb not null default '[]'::jsonb, -- [{document_id, chunk_id, snippet, speaker, timestamp, filename}]
  created_at timestamptz not null default now()
);

create index idx_qa_project on public.qa_history(project_id);
create index idx_qa_user on public.qa_history(user_id);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger trg_documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();
