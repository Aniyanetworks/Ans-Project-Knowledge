import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { askQuestion } from '../../lib/api'
import SourceCitations from '../../components/SourceCitations'

export default function ProjectChat() {
  const { projectId } = useParams()
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [messages, setMessages] = useState([]) // [{ role, content, sources, id }]
  const [input, setInput] = useState('')
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    supabase.from('projects').select('*').eq('id', projectId).single().then(({ data }) => setProject(data))
    loadHistory()
  }, [projectId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, asking])

  async function loadHistory() {
    const { data, error } = await supabase
      .from('qa_history')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
    if (error) return
    const historyMessages = (data ?? []).flatMap((qa) => [
      { id: `${qa.id}-q`, role: 'user', content: qa.question },
      { id: `${qa.id}-a`, role: 'assistant', content: qa.answer, sources: qa.sources },
    ])
    setMessages(historyMessages)
  }

  async function handleSend(e) {
    e.preventDefault()
    const question = input.trim()
    if (!question || asking) return

    setInput('')
    setError(null)
    setMessages((m) => [...m, { id: `local-q-${Date.now()}`, role: 'user', content: question }])
    setAsking(true)

    try {
      const result = await askQuestion({ projectId, question, userId: user.id })
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
        { id: `local-err-${Date.now()}`, role: 'assistant', content: `⚠️ ${err.message}`, isError: true },
      ])
    } finally {
      setAsking(false)
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-64px)] max-w-4xl flex-col px-6 py-6">
      <Link to="/" className="mb-2 inline-block text-sm text-slate-500 hover:text-slate-700">
        ← Your projects
      </Link>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">{project?.name ?? '…'}</h1>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4">
        {messages.length === 0 && (
          <p className="text-sm text-slate-400">Ask a question about this project to get started.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : m.isError
                  ? 'bg-red-50 text-red-700'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.role === 'assistant' && !m.isError && <SourceCitations sources={m.sources} />}
            </div>
          </div>
        ))}
        {asking && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-500">Thinking…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSend} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this project…"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        <button
          type="submit"
          disabled={asking || !input.trim()}
          className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
