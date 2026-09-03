-- ============================================================================
-- qa_history.user_id was missing ON DELETE CASCADE. Deleting a developer
-- account (auth.users -> profiles cascades already) would fail with a foreign
-- key violation for any developer who has ever asked a question, since their
-- qa_history rows would block the profiles row from being deleted. Once an
-- account is gone, its Q&A history should go with it — matches project_access,
-- which already cascades correctly.
-- ============================================================================

alter table public.qa_history drop constraint qa_history_user_id_fkey;
alter table public.qa_history add constraint qa_history_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;
