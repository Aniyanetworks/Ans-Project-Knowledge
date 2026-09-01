-- ============================================================================
-- match_document_chunks: pgvector similarity search scoped to a project.
-- Called by n8n (via Supabase service role, or an RPC REST call) during the
-- Q&A workflow. SECURITY DEFINER + explicit project_id filter keeps this
-- safe to also expose to authenticated users scoped to their own access,
-- but in this design n8n calls it with the service role key.
-- ============================================================================

create or replace function public.match_document_chunks(
  p_project_id uuid,
  p_query_embedding vector(1536),
  p_match_count int default 8,
  p_min_similarity float default 0.0
)
returns table (
  chunk_id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float,
  original_filename text,
  source_type document_source_type
)
language sql
stable
as $$
  select
    dc.id as chunk_id,
    dc.document_id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> p_query_embedding) as similarity,
    d.original_filename,
    d.source_type
  from public.document_chunks dc
  join public.documents d on d.id = dc.document_id
  where dc.project_id = p_project_id
    and 1 - (dc.embedding <=> p_query_embedding) >= p_min_similarity
  order by dc.embedding <=> p_query_embedding
  limit p_match_count;
$$;

comment on function public.match_document_chunks is
  'Cosine similarity search over document_chunks scoped to a single project. Used by the n8n Q&A workflow.';
