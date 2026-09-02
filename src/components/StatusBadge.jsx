const STYLES = {
  pending: { badge: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  parsing: { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500 animate-pulse' },
  parsed: { badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  embedding: { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500 animate-pulse' },
  embedded: { badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  failed: { badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
}

export default function StatusBadge({ status }) {
  const style = STYLES[status] ?? STYLES.pending
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  )
}
