# Ans-Project-Knowledge

Full-stack platform for managing project knowledge (call transcripts, chat logs, images,
notes) and letting developers ask AI-powered questions about a specific project, with
source citations.

**Stack:** React (Vite) + Tailwind · Supabase (Postgres + pgvector, Auth, Storage) · n8n
(ingestion + Q&A orchestration, hosted separately) · OpenAI (embeddings + chat completions)

```
frontend/
├── src/
│   ├── pages/admin/       # Project CRUD, uploads, ingestion status, developer access
│   ├── pages/developer/   # Accessible projects, per-project chat + Q&A history
│   ├── components/        # Navbar, upload widget, source citations, etc.
│   ├── contexts/          # Supabase auth/session/role context
│   └── lib/                # Supabase client + API layer (n8n webhook calls)
└── supabase/
    └── migrations/         # SQL: schema, RLS policies, pgvector search RPC, storage bucket
```

n8n workflow JSON (ingestion + Q&A pipelines) lives in a separate location — see your
project notes / docs for import instructions; they're not part of this repo.

## Setup

### 1. Supabase
Create a project, then run the 4 files in `supabase/migrations/` **in order** via the
SQL editor (or `psql`/CLI against your project's connection string):

1. `0001_init_schema.sql` — tables, enums, auto-profile-on-signup trigger
2. `0002_rls_policies.sql` — Row Level Security (admin-sees-all vs. developer scoped by `project_access`)
3. `0003_search_function.sql` — `match_document_chunks()` pgvector RPC
4. `0004_storage.sql` — private `project-files` Storage bucket + policies

Promote your first user to admin after signing up once through the app:

```sql
update public.profiles set role = 'admin' where email = 'you@company.com';
```

### 2. Frontend

```bash
npm install
cp .env.example .env   # fill in Supabase URL/anon key + n8n webhook URLs
npm run dev
```

| Env var | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key (RLS enforces access, safe for the browser) |
| `VITE_N8N_INGEST_WEBHOOK_URL` | n8n ingestion workflow's production webhook URL |
| `VITE_N8N_QA_WEBHOOK_URL` | n8n Q&A workflow's production webhook URL |

## Roles & access

- `profiles.role` is `admin` or `developer`. New signups default to `developer`.
- Admins: full CRUD on projects, uploads, developer access grants.
- Developers: see only projects granted via `project_access`; ask questions and view
  their own Q&A history per project.
