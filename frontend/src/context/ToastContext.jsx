import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Loader2 } from 'lucide-react';

const ToastContext = createContext(null);

let idCounter = 0;

const TOAST_STYLES = {
  success: {
    icon: CheckCircle2,
    accent: 'text-emerald-500',
    ring: 'border-emerald-200 dark:border-emerald-800',
    bg: 'bg-emerald-50 dark:bg-surface-800',
    bar: 'bg-emerald-500',
  },
  error: {
    icon: AlertCircle,
    accent: 'text-red-500',
    ring: 'border-red-200 dark:border-red-800',
    bg: 'bg-red-50 dark:bg-surface-800',
    bar: 'bg-red-500',
  },
  info: {
    icon: Info,
    accent: 'text-primary-500',
    ring: 'border-primary-200 dark:border-primary-800',
    bg: 'bg-primary-50 dark:bg-surface-800',
    bar: 'bg-primary-500',
  },
  loading: {
    icon: Loader2,
    accent: 'text-primary-500',
    ring: 'border-primary-200 dark:border-primary-800',
    bg: 'bg-primary-50 dark:bg-surface-800',
    bar: 'bg-primary-500',
  },
};

function ToastItem({ toast, onDismiss }) {
  const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
  const Icon = style.icon;
  const [leaving, setLeaving] = useState(false);

  const dismiss = () => {
    setLeaving(true);
    setTimeout(onDismiss, 200);
  };

  return (
    <div
      className={`relative w-full max-w-sm overflow-hidden rounded-xl border shadow-lg backdrop-blur-sm animate-scale-in transition-all duration-200 ${style.bg} ${style.ring} ${
        leaving ? 'opacity-0 translate-x-4' : 'opacity-100'
      }`}
      role="status"
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.bar}`} />
      <div className="flex items-start gap-3 px-4 py-3.5 pl-5">
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${style.accent} ${toast.type === 'loading' ? 'animate-spin' : ''}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-surface-900 dark:text-white break-words">{toast.title}</p>
          {toast.message && (
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 break-words">{toast.message}</p>
          )}
        </div>
        <button
          onClick={dismiss}
          className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 flex-shrink-0 p-0.5 rounded hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type, title, message, duration = 4000) => {
    const id = ++idCounter;
    setToasts((prev) => [...prev.slice(-4), { id, type, title, message }]);
    if (type !== 'loading' && duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const toast = useCallback({
    success: (title, message) => push('success', title, message),
    error: (title, message) => push('error', title, message),
    info: (title, message) => push('info', title, message),
    loading: (title, message) => push('loading', title, message, 0),
    dismiss,
  }, [push, dismiss]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 items-end pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full max-w-sm">
            <ToastItem toast={t} onDismiss={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
