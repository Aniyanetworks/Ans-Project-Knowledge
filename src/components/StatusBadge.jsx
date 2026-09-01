const STYLES = {
  pending: 'bg-slate-100 text-slate-600',
  parsing: 'bg-amber-100 text-amber-700',
  parsed: 'bg-blue-100 text-blue-700',
  embedding: 'bg-amber-100 text-amber-700',
  embedded: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

export default function StatusBadge({ status }) {
  const style = STYLES[status] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}>
      {status}
    </span>
  )
}
