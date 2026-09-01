-- ============================================================================
-- Row Level Security
-- Model: admins see/do everything; developers see only projects they have
-- an entry for in project_access (and derived rows within those projects).
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_access enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.qa_history enable row level security;

-- ----------------------------------------------------------------------------
-- helper: is the current user an admin? (security definer avoids RLS recursion)
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.has_project_access(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_admin() or exists (
    select 1 from public.project_access
    where project_id = p_project_id and user_id = auth.uid()
  );
$$;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
create policy "profiles: users can read own row"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: admins can read all"
  on public.profiles for select
  using (public.is_admin());

create policy "profiles: admins can update roles"
  on public.profiles for update
  using (public.is_admin());

create policy "profiles: users can update own non-role fields"
  on public.profiles for update
  using (id = auth.uid());

-- ----------------------------------------------------------------------------
-- projects
-- ----------------------------------------------------------------------------
create policy "projects: admins full access"
  on public.projects for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "projects: developers read accessible projects"
  on public.projects for select
  using (public.has_project_access(id));

-- ----------------------------------------------------------------------------
-- project_access
-- ----------------------------------------------------------------------------
create policy "project_access: admins full access"
  on public.project_access for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "project_access: developers read own grants"
  on public.project_access for select
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- documents
-- ----------------------------------------------------------------------------
create policy "documents: admins full access"
  on public.documents for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "documents: developers read within accessible projects"
  on public.documents for select
  using (public.has_project_access(project_id));

-- ----------------------------------------------------------------------------
-- document_chunks
-- ----------------------------------------------------------------------------
create policy "document_chunks: admins full access"
  on public.document_chunks for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "document_chunks: developers read within accessible projects"
  on public.document_chunks for select
  using (public.has_project_access(project_id));

-- ----------------------------------------------------------------------------
-- qa_history
-- ----------------------------------------------------------------------------
create policy "qa_history: admins full access"
  on public.qa_history for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "qa_history: developers read own history in accessible projects"
  on public.qa_history for select
  using (user_id = auth.uid() and public.has_project_access(project_id));

create policy "qa_history: developers insert own history in accessible projects"
  on public.qa_history for insert
  with check (user_id = auth.uid() and public.has_project_access(project_id));

-- ============================================================================
-- Note: document ingestion (INSERT/UPDATE on documents, document_chunks) is
-- performed by n8n using the Supabase SERVICE ROLE key, which bypasses RLS
-- entirely. These policies govern access from the browser (anon/authenticated
-- key) only. The React app never writes chunks or embeddings directly.
-- ============================================================================
