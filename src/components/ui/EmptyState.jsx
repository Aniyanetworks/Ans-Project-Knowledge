function DefaultIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 9.75h16.5M3.75 9.75v8.25A2.25 2.25 0 0 0 6 20.25h12A2.25 2.25 0 0 0 20.25 18V9.75M3.75 9.75l1.72-4.13A2.25 2.25 0 0 1 7.54 4.5h8.92a2.25 2.25 0 0 1 2.07 1.12l1.72 4.13M9 13.5h6"
      />
    </svg>
  )
}

export default function EmptyState({ icon: Icon = DefaultIcon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 px-6 py-12 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon className="h-5 w-5" />
      </div>
      {title && <p className="text-sm font-medium text-slate-700">{title}</p>}
      {description && <p className="mt-1 max-w-sm text-sm text-slate-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
