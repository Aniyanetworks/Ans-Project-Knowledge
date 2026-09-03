-- ============================================================================
-- Supports the WhatsApp -> transcript workflow (04-whatsapp-transcript-workflow.json):
-- an admin DMs the project's WhatsApp Business number tagging a project
-- (e.g. "@ProjectName ...") and the message gets appended to a running
-- transcript document for that project, which is then parsed/embedded
-- through the same ingestion pipeline as any other pasted transcript.
-- ============================================================================

-- 'whatsapp' joins the existing enum of transcript sources (fathom/fireflies/
-- tldv/manual/image) so these documents show up in the Transcripts tab like
-- any other pasted text, filterable/editable the same way.
alter type document_source_type add value 'whatsapp';

-- Maps a WhatsApp sender's phone number to the admin profile that's allowed to
-- create transcripts by tagging a project in the group. Not exposed in the
-- frontend yet — manage rows directly via the Supabase table editor:
--   phone_number: digits only, no "+" and no WhatsApp JID suffix (e.g. '8801XXXXXXXXX')
--   label: friendly name used in the generated transcript text (e.g. "Manam")
--   profile_id: the matching row in public.profiles (must have role = 'admin')
create table public.admin_phone_numbers (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null unique,
  label text,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_phone_numbers enable row level security;

-- Admin-only: n8n reads this via the service role key (bypassing RLS) to
-- check the sender of an incoming WhatsApp message; admins can manage it
-- through Supabase directly since there's no dedicated UI for it yet.
create policy "admin_phone_numbers: admins full access"
  on public.admin_phone_numbers for all
  using (public.is_admin())
  with check (public.is_admin());
