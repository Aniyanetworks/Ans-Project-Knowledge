import Button from './ui/Button'

/**
 * Custom confirmation modal — replaces window.confirm() so destructive actions
 * (like deleting a project) get a styled dialog instead of the browser's
 * native "<site> says" popup.
 */
export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  error = null,
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-[2px]"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm animate-fade-in rounded-xl bg-white p-5 shadow-2xl shadow-slate-900/20"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-base font-semibold text-slate-900">{title}</h2>
        <p className="mb-5 text-sm leading-relaxed text-slate-600">{message}</p>
        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} size="sm" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
