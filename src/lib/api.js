import { supabase } from './supabaseClient'

const INGEST_WEBHOOK_URL = import.meta.env.VITE_N8N_INGEST_WEBHOOK_URL
const QA_WEBHOOK_URL = import.meta.env.VITE_N8N_QA_WEBHOOK_URL

const STORAGE_BUCKET = 'project-files'

/**
 * Upload a file to Supabase Storage under {project_id}/{crypto-random}/{filename},
 * insert a `documents` row (status: pending), then notify n8n to start ingestion.
 * Used for Fathom/Fireflies/tl;dv export files and images.
 */
export async function uploadFileDocument({ projectId, file, sourceType, userId }) {
  const path = `${projectId}/${crypto.randomUUID()}/${file.name}`

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: false })
  if (uploadError) throw uploadError

  const { data: doc, error: insertError } = await supabase
    .from('documents')
    .insert({
      project_id: projectId,
      source_type: sourceType,
      original_filename: file.name,
      storage_path: path,
      uploaded_by: userId,
      status: 'pending',
    })
    .select()
    .single()
  if (insertError) throw insertError

  await triggerIngest(doc.id)
  return doc
}

/**
 * Insert a `documents` row for manually pasted text (no file), then notify n8n.
 */
export async function submitManualText({ projectId, text, userId, label }) {
  const { data: doc, error: insertError } = await supabase
    .from('documents')
    .insert({
      project_id: projectId,
      source_type: 'manual',
      original_filename: label || 'Pasted text',
      raw_text: text,
      uploaded_by: userId,
      status: 'pending',
    })
    .select()
    .single()
  if (insertError) throw insertError

  await triggerIngest(doc.id)
  return doc
}

/**
 * Notify the n8n ingestion workflow that a new document is ready to process.
 * n8n fetches the document row itself (via service role) so we only need to
 * pass the id — this keeps the payload small and avoids re-uploading file bytes.
 */
async function triggerIngest(documentId) {
  if (!INGEST_WEBHOOK_URL) {
    console.warn('VITE_N8N_INGEST_WEBHOOK_URL is not set — skipping ingestion trigger.')
    return
  }
  const res = await fetch(INGEST_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_id: documentId }),
  })
  if (!res.ok) {
    throw new Error(`Ingestion trigger failed: ${res.status} ${await res.text()}`)
  }
}

/**
 * Ask a question about a project. Calls the n8n Q&A webhook, which embeds the
 * question, runs vector search scoped to the project, calls the LLM, writes
 * qa_history, and returns the answer + source citations.
 */
export async function askQuestion({ projectId, question, userId }) {
  if (!QA_WEBHOOK_URL) {
    throw new Error('VITE_N8N_QA_WEBHOOK_URL is not set.')
  }
  const res = await fetch(QA_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, question, user_id: userId }),
  })
  if (!res.ok) {
    throw new Error(`Q&A request failed: ${res.status} ${await res.text()}`)
  }
  return res.json() // { answer, sources: [...], qa_history_id }
}

/** Signed URL for viewing/downloading a private storage object (default 1hr expiry). */
export async function getSignedUrl(storagePath, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds)
  if (error) throw error
  return data.signedUrl
}
