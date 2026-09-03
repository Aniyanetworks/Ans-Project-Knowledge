-- ============================================================================
-- Restricted topics: an admin-editable "not to do" list the Q&A workflow reads
-- at query time and folds into the LLM system prompt, e.g. "don't discuss
-- project budget / personal conversations / client PII". Global across all
-- projects (not per-project) — one list, admin-maintained, seeded with
-- sensible defaults below that can be edited, disabled, or deleted.
-- ============================================================================

create table public.restricted_topics (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  description text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_restricted_topics_updated_at before update on public.restricted_topics
  for each row execute function public.set_updated_at();

alter table public.restricted_topics enable row level security;

-- Admin-only: this list is maintained by admins and read by n8n via the
-- service role key (bypassing RLS) — developers never query it directly.
create policy "restricted_topics: admins full access"
  on public.restricted_topics for all
  using (public.is_admin())
  with check (public.is_admin());

-- Sensible starting defaults — admin can edit labels/descriptions, disable
-- (is_active = false) without losing the row, or delete entirely.
insert into public.restricted_topics (label, description) values
  ('Project budget & financial figures', 'Specific budget numbers, costs, pricing, or financial details discussed in transcripts.'),
  ('Personal or private conversations', 'Small talk, personal matters, or side conversations unrelated to the project itself.'),
  ('Client personal details', 'Names, contact info, or other personally identifiable information about clients or their staff.'),
  ('Salary & compensation', 'Individual pay, compensation, or contractor rate information.'),
  ('Legal & contractual disputes', 'Specifics of legal disagreements, contract disputes, or liability discussions.');
