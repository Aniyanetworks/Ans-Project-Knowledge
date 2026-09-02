import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { askQuestion, uploadChatImage, deleteQaHistoryEntry, resetChatHistory } from '../lib/api'
import SourceCitations from './SourceCitations'
import Button from './ui/Button'
import Spinner from './ui/Spinner'
import EmptyState from './ui/EmptyState'
import ConfirmDialog from './ConfirmDialog'

const MAX_IMAGES = 5 // matches the cap enforced server-side in the Q&A workflow

function ImageIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 21h18a1.5 1.5 0 0 0 1.5-1.5V4.5A1.5 1.5 0 0 0 21 3H3a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 3 21ZM9 9.75a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"
      />
    </svg>
  )
}

function TrashIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  )
}

function ChatBubbleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
      />
    </svg>
  )
}

const X_ICON_PATH = 'M6 18L18 6M6 6l12 12'

let attachmentIdCounter = 0

/**
 * The reusable Q&A chat UI: history, ask/retry/delete/reset, multi-image attach.
 * Used both by the developer's full-page chat route and the admin's "Test" tab
 * on a project (so admins can test Q&A without a separate dev account).
 *
 * `heightClassName` lets the two call sites size it differently — the
 * standalone page uses full viewport height, the admin tab uses a fixed height
 * since it sits inside the tabbed layout rather than owning the whole page.
 */
export default function ChatPanel({ projectId, heightClassName = 'h-[calc(100vh-64px)]' }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([]) // [{ id, role, content, sources, isError, question, imageUrls }]
  const [input, setInput] = useState('')
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState(null)
  const [attachments, setAttachments] = useState([]) // [{ id, file, previewUrl }]
  const [attachError, setAttachError] = useState(null)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, asking])

  async function loadHistory() {
    // Explicitly scope by user_id, not just project_id — RLS enforces this for
    // developers anyway, but admins bypass RLS entirely (full-access policy), so
    // without this filter an admin using this same panel would see every
    // developer's history mixed into their own.
    const { data, error } = await supabase
      .from('qa_history')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    if (error) return
    const historyMessages = (data ?? []).flatMap((qa) => [
      { id: `${qa.id}-q`, role: 'user', content: qa.question },
      { id: qa.id, role: 'assistant', content: qa.answer, sources: qa.sources },
    ])
    setMessages(historyMessages)
  }

  function handlePickImages(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'))
    if (files.length === 0) return
    setAttachError(null)
    setAttachments((prev) => {
      const room = MAX_IMAGES - prev.length
      if (room <= 0) {
        setAttachError(`You can attach up to ${MAX_IMAGES} images.`)
        return prev
      }
      const accepted = files.slice(0, room)
      if (files.length > accepted.length) {
        setAttachError(`Only added ${accepted.length} — you can attach up to ${MAX_IMAGES} images.`)
      }
      const next = accepted.map((file) => ({
        id: `att-${attachmentIdCounter++}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }))
      return [...prev, ...next]
    })
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items
    if (!items) return
    const imageFiles = Array.from(items)
      .filter((item) => item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter(Boolean)
    if (imageFiles.length > 0) {
      e.preventDefault() // don't also paste a filename/garbage into the text input
      handlePickImages(imageFiles)
    }
  }

  function removeAttachment(id) {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((a) => a.id !== id)
    })
  }

  async function handleSend(e) {
    e.preventDefault()
    const question = input.trim()
    if (!question || asking) return

    const attachmentsToSend = attachments
    setInput('')
    // Note: NOT revoking the preview URLs here — they're about to be shown in the
    // message bubble below. They're only revoked when explicitly removed pre-send.
    setAttachments([])
    setAttachError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setMessages((m) => [
      ...m,
      {
        id: `local-q-${Date.now()}`,
        role: 'user',
        content: question,
        imageUrls: attachmentsToSend.map((a) => a.previewUrl),
      },
    ])
    await runAsk(question, attachmentsToSend)
  }

  async function handleRetry(failedMessageId, question) {
    if (asking) return
    setMessages((m) => m.filter((msg) => msg.id !== failedMessageId))
    await runAsk(question)
  }

  async function runAsk(question, attachmentsToSend = []) {
    setError(null)
    setAsking(true)
    try {
      let imagePaths
      if (attachmentsToSend.length > 0) {
        imagePaths = await Promise.all(
          attachmentsToSend.map((a) => uploadChatImage({ projectId, file: a.file }))
        )
      }
      const result = await askQuestion({ projectId, question, userId: user.id, imagePaths })
      setMessages((m) => [
        ...m,
        {
          id: result.qa_history_id ?? `local-a-${Date.now()}`,
          role: 'assistant',
          content: result.answer,
          sources: result.sources,
        },
      ])
    } catch (err) {
      setError(err.message)
      setMessages((m) => [
        ...m,
        {
          id: `local-err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ ${err.message}`,
          isError: true,
          question,
        },
      ])
    } finally {
      setAsking(false)
    }
  }

  async function handleDeletePair(assistantId) {
    if (typeof assistantId !== 'string' || assistantId.startsWith('local-')) return
    try {
      await deleteQaHistoryEntry(assistantId)
      setMessages((m) => {
        const idx = m.findIndex((msg) => msg.id === assistantId)
        if (idx === -1) return m
        return m.filter((_, i) => i !== idx && i !== idx - 1)
      })
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleResetChat() {
    setResetting(true)
    try {
      await resetChatHistory({ projectId, userId: user.id })
      setMessages([])
      setConfirmingReset(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setResetting(false)
    }
  }

  const lastErrorMessage = [...messages].reverse().find((m) => m.isError)

  return (
    <div className={`flex flex-col ${heightClassName}`}>
      {messages.length > 0 && (
        <div className="mb-2 flex justify-end">
          <button
            onClick={() => setConfirmingReset(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-red-600"
          >
            <TrashIcon className="h-3.5 w-3.5" />
            Reset chat
          </button>
        </div>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {messages.length === 0 && (
          <EmptyState
            icon={ChatBubbleIcon}
            title="No questions yet"
            description="Ask anything about this project's transcripts, notes, and images — answers come with source citations."
          />
        )}
        {messages.map((m) => (
          <div key={m.id} className={`group flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                m.role === 'user'
                  ? 'bg-accent-600 text-white shadow-sm'
                  : m.isError
                  ? 'bg-red-50 text-red-700'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              {m.imageUrls && m.imageUrls.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {m.imageUrls.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt="Attached"
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                  ))}
                </div>
              )}
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.role === 'assistant' && !m.isError && <SourceCitations sources={m.sources} />}
              {m.isError && (
                <button
                  onClick={() => handleRetry(m.id, m.question)}
                  disabled={asking}
                  className="mt-2 text-xs font-medium text-red-700 underline hover:no-underline disabled:opacity-50"
                >
                  Retry
                </button>
              )}
              {m.role === 'assistant' && !m.isError && (
                <button
                  onClick={() => handleDeletePair(m.id)}
                  className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                >
                  <TrashIcon className="h-3 w-3" />
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        {asking && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500">
              <Spinner className="h-3.5 w-3.5" label="Thinking…" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error}
          {lastErrorMessage && (
            <button
              onClick={() => handleRetry(lastErrorMessage.id, lastErrorMessage.question)}
              disabled={asking}
              className="ml-2 font-medium underline hover:no-underline disabled:opacity-50"
            >
              Retry
            </button>
          )}
        </p>
      )}

      {attachments.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          {attachments.map((a) => (
            <div key={a.id} className="group/thumb relative h-16 w-16 shrink-0">
              <div className="h-full w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                <img
                  src={a.previewUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
              <button
                onClick={() => removeAttachment(a.id)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm hover:text-red-500"
                aria-label="Remove attached image"
              >
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="h-3 w-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d={X_ICON_PATH} />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      {attachError && <p className="mt-2 text-xs text-amber-600">{attachError}</p>}

      <form onSubmit={handleSend} className="mt-4 flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handlePickImages(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={asking || attachments.length >= MAX_IMAGES}
          className="flex shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50"
          aria-label="Attach images"
          title={`Attach images (up to ${MAX_IMAGES})`}
        >
          <ImageIcon className="h-4.5 w-4.5" />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPaste={handlePaste}
          placeholder="Ask a question about this project… (paste an image to attach it)"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm shadow-sm transition-shadow placeholder:text-slate-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
        />
        <Button type="submit" disabled={asking || !input.trim()}>
          Send
        </Button>
      </form>

      <ConfirmDialog
        open={confirmingReset}
        title="Reset chat?"
        message="This permanently deletes your entire Q&A history for this project. This cannot be undone."
        confirmLabel="Reset"
        danger
        busy={resetting}
        onConfirm={handleResetChat}
        onCancel={() => setConfirmingReset(false)}
      />
    </div>
  )
}
