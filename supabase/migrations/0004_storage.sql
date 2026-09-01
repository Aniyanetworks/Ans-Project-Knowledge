-- ============================================================================
-- Storage: single private bucket "project-files" holding raw uploads
-- (transcripts, exports, images). Path convention:
--   {project_id}/{document_id}/{original_filename}
-- The React app requests signed URLs for display/download; the bucket is
-- private (not public) so access always goes through RLS-checked signing.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

-- Admins: full read/write/delete on the bucket
create policy "storage: admins full access"
  on storage.objects for all
  using (bucket_id = 'project-files' and public.is_admin())
  with check (bucket_id = 'project-files' and public.is_admin());

-- Developers: read-only, restricted to objects whose path's first segment
-- (the project_id folder) matches a project they have access to.
create policy "storage: developers read accessible project files"
  on storage.objects for select
  using (
    bucket_id = 'project-files'
    and public.has_project_access(( (storage.foldername(name))[1] )::uuid)
  );
