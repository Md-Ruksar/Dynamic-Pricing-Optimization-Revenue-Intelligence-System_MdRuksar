import { AlertTriangle, X, Loader2 } from 'lucide-react';

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={loading ? undefined : onCancel}>
      <div
        className="modal-content max-w-md animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-xl flex-shrink-0 ${
                danger
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-amber-100 dark:bg-amber-900/30'
              }`}
            >
              <AlertTriangle
                className={`w-6 h-6 ${danger ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white">{title}</h3>
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-1.5 leading-relaxed">
                {message}
              </p>
            </div>
            {!loading && (
              <button
                onClick={onCancel}
                className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 flex-shrink-0 p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <button onClick={onCancel} disabled={loading} className="btn-secondary">
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={danger ? 'btn-danger' : 'btn-primary'}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
