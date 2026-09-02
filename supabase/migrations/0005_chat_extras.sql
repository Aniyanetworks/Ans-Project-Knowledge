-- ============================================================================
-- Chat extras: let developers delete their own Q&A history entries, and let
-- them upload images as ephemeral chat attachments (analyzed inline by the
-- Q&A workflow, not added to the permanent project knowledge base).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- qa_history: developers can delete their own entries (per-message delete,
-- and "reset chat" which deletes every row for that user+project at once)
-- ----------------------------------------------------------------------------
create policy "qa_history: developers delete own history in accessible projects"
  on public.qa_history for delete
  using (user_id = auth.uid() and public.has_project_access(project_id));

-- ----------------------------------------------------------------------------
-- storage: developers can upload chat-attachment images, scoped to a
-- dedicated path segment so this doesn't grant general document upload.
-- Path convention: {project_id}/chat-attachments/{random}/{filename}
-- ----------------------------------------------------------------------------
create policy "storage: developers upload chat attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'project-files'
    and (storage.foldername(name))[2] = 'chat-attachments'
    and public.has_project_access(((storage.foldername(name))[1])::uuid)
  );
