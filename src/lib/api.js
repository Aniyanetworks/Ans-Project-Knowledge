import { supabase } from './supabaseClient'

const INGEST_WEBHOOK_URL = import.meta.env.VITE_N8N_INGEST_WEBHOOK_URL
const QA_WEBHOOK_URL = import.meta.env.VITE_N8N_QA_WEBHOOK_URL
const INVITE_WEBHOOK_URL = import.meta.env.VITE_N8N_INVITE_WEBHOOK_URL

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
 * Update a manually-pasted document's text and re-run ingestion. Clears any
 * existing chunks first so the old embeddings don't linger alongside new ones,
 * and resets status so the ingestion status UI reflects the re-run.
 */
export async function updateManualText({ documentId, text, label }) {
  const { error: chunkErr } = await supabase
    .from('document_chunks')
    .delete()
    .eq('document_id', documentId)
  if (chunkErr) throw chunkErr

  const { error: updateErr } = await supabase
    .from('documents')
    .update({
      raw_text: text,
      original_filename: label || 'Pasted text',
      status: 'pending',
      error_message: null,
    })
    .eq('id', documentId)
  if (updateErr) throw updateErr

  await triggerIngest(documentId)
}

/**
 * Delete a document: removes its Storage object (if any) and its DB row.
 * document_chunks and any other FK-dependent rows cascade via ON DELETE CASCADE.
 */
export async function deleteDocument({ documentId, storagePath }) {
  if (storagePath) {
    const { error: storageErr } = await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
    if (storageErr) throw storageErr
  }
  const { error } = await supabase.from('documents').delete().eq('id', documentId)
  if (error) throw error
}

/**
 * Notify the n8n ingestion workflow that a new document is ready to process.
 * n8n fetches the document row itself (via service role) so we only need to
 * pass the id — this keeps the payload small and avoids re-uploading file bytes.
 */
export async function triggerIngest(documentId) {
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
 * qa_history, and returns the answer + source citations. `imagePath`, if given,
 * is analyzed inline (vision) as context for this one answer — it is not added
 * to the project's permanent knowledge base.
 */
export async function askQuestion({ projectId, question, userId, imagePath }) {
  if (!QA_WEBHOOK_URL) {
    throw new Error('VITE_N8N_QA_WEBHOOK_URL is not set.')
  }
  const res = await fetch(QA_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, question, user_id: userId, image_path: imagePath }),
  })
  if (!res.ok) {
    throw new Error(`Q&A request failed: ${res.status} ${await res.text()}`)
  }
  return res.json() // { answer, sources: [...], qa_history_id }
}

/**
 * Uploads an image as an ephemeral chat attachment (separate path prefix from
 * document uploads, so developers can do this without the broader "upload
 * documents" permission admins have). Returns the storage path to pass to
 * askQuestion as `imagePath`.
 */
export async function uploadChatImage({ projectId, file }) {
  const path = `${projectId}/chat-attachments/${crypto.randomUUID()}/${file.name}`
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: false })
  if (error) throw error
  return path
}

/** Deletes a single Q&A exchange from a project's chat history. */
export async function deleteQaHistoryEntry(id) {
  const { error } = await supabase.from('qa_history').delete().eq('id', id)
  if (error) throw error
}

/** Clears all Q&A history for the current user in a project ("reset chat"). */
export async function resetChatHistory({ projectId, userId }) {
  const { error } = await supabase
    .from('qa_history')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId)
  if (error) throw error
}

/**
 * Creates a new developer account via the n8n workflow (which uses the
 * Supabase service_role key server-side — this can't run in the browser).
 * Two modes, both returning a user_id whose `profiles` row already exists
 * (created by the signup trigger) so access can be granted immediately:
 *  - `password` omitted: Supabase sends an invite email with a sign-in link.
 *  - `password` given: account is created and usable immediately, no email sent.
 */
export async function inviteDeveloper({ email, password, invitedBy }) {
  if (!INVITE_WEBHOOK_URL) {
    throw new Error('VITE_N8N_INVITE_WEBHOOK_URL is not set.')
  }
  const res = await fetch(INVITE_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, invited_by: invitedBy }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.success === false) {
    throw new Error(body.error || `Invite failed: ${res.status}`)
  }
  return body // { success: true, user_id, email }
}

/** Signed URL for viewing/downloading a private storage object (default 1hr expiry). */
export async function getSignedUrl(storagePath, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds)
  if (error) throw error
  return data.signedUrl
}
