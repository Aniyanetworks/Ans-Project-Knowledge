const VARIANTS = {
  primary:
    'bg-accent-600 text-white shadow-sm hover:bg-accent-700 disabled:hover:bg-accent-600',
  secondary:
    'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:hover:bg-white',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:hover:bg-red-600',
  ghost: 'text-slate-500 hover:text-slate-800 hover:bg-slate-100',
}

const SIZES = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
