-- ============================================================================
-- Developer-owned projects: any developer can create a project and becomes its
-- owner (projects.created_by). Owners can then, for that project only:
--   - edit / archive / delete it
--   - upload, edit, and delete transcripts & images (documents + storage)
--   - grant / revoke other developers' access (project_access)
-- Developers who were merely granted access stay read-only (chat only), same
-- as before. Admin policies are unchanged — admins still see/do everything.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- helper: does the current user own this project?
-- (security definer avoids RLS recursion, same as is_admin/has_project_access)
-- ----------------------------------------------------------------------------
create or replace function public.is_project_owner(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.projects
    where id = p_project_id and created_by = auth.uid()
  );
$$;

-- Owners implicitly have access to their own projects (no project_access row
-- needed), so documents/chunks/qa_history/storage read policies — which all go
-- through has_project_access — cover owned projects automatically.
create or replace function public.has_project_access(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_admin()
    or public.is_project_owner(p_project_id)
    or exists (
      select 1 from public.project_access
      where project_id = p_project_id and user_id = auth.uid()
    );
$$;

-- ----------------------------------------------------------------------------
-- projects
-- ----------------------------------------------------------------------------
create policy "projects: developers create own projects"
  on public.projects for insert
  with check (created_by = auth.uid());

-- Direct check (not via has_project_access) so `insert ... returning` can see
-- the row it just created — a stable security-definer lookup wouldn't yet.
create policy "projects: owners read own projects"
  on public.projects for select
  using (created_by = auth.uid());

create policy "projects: owners update own projects"
  on public.projects for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "projects: owners delete own projects"
  on public.projects for delete
  using (created_by = auth.uid());

-- ----------------------------------------------------------------------------
-- project_access: owners manage who else can see their project
-- ----------------------------------------------------------------------------
create policy "project_access: owners read grants on own projects"
  on public.project_access for select
  using (public.is_project_owner(project_id));

create policy "project_access: owners grant access on own projects"
  on public.project_access for insert
  with check (public.is_project_owner(project_id) and granted_by = auth.uid());

create policy "project_access: owners revoke access on own projects"
  on public.project_access for delete
  using (public.is_project_owner(project_id));

-- ----------------------------------------------------------------------------
-- profiles: developers can see other developer accounts (so an owner can pick
-- who to assign). Admin rows stay hidden from developers.
-- ----------------------------------------------------------------------------
create policy "profiles: authenticated users read developer profiles"
  on public.profiles for select
  to authenticated
  using (role = 'developer');

-- ----------------------------------------------------------------------------
-- documents: owners upload / edit / delete within their own projects
-- (ingestion itself is still done by n8n with the service role key)
-- ----------------------------------------------------------------------------
create policy "documents: owners insert into own projects"
  on public.documents for insert
  with check (public.is_project_owner(project_id) and uploaded_by = auth.uid());

create policy "documents: owners update within own projects"
  on public.documents for update
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

create policy "documents: owners delete within own projects"
  on public.documents for delete
  using (public.is_project_owner(project_id));

-- updateManualText clears a document's old chunks before re-ingesting.
create policy "document_chunks: owners delete within own projects"
  on public.document_chunks for delete
  using (public.is_project_owner(project_id));

-- ----------------------------------------------------------------------------
-- storage: owners upload / delete files under their project's folder
-- Path convention: {project_id}/{document_id}/{original_filename}
-- ----------------------------------------------------------------------------
create policy "storage: owners upload own project files"
  on storage.objects for insert
  with check (
    bucket_id = 'project-files'
    and public.is_project_owner(((storage.foldername(name))[1])::uuid)
  );

create policy "storage: owners delete own project files"
  on storage.objects for delete
  using (
    bucket_id = 'project-files'
    and public.is_project_owner(((storage.foldername(name))[1])::uuid)
  );
