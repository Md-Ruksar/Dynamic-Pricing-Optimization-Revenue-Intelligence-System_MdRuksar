import { useLocation, Link } from 'react-router-dom';
import { Sparkles, Clock3, CheckCircle2, ArrowLeft } from 'lucide-react';

/**
 * Shown to users whose identity was verified but whose account is still
 * awaiting administrator approval. Never grants access to the app.
 */
export default function AccessPending() {
  const location = useLocation();
  const state = location.state || {};
  const email = state.email || sessionStorage.getItem('pending_email') || '';
  const name = state.name || sessionStorage.getItem('pending_name') || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-50 via-primary-50/30 to-surface-50 dark:from-surface-950 dark:via-primary-950/20 dark:to-surface-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/25 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            Access Pending
          </h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            PricePilot AI - Administrator approval required
          </p>
        </div>

        <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl border border-surface-200 dark:border-surface-700 p-8">
          {/* Pending icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock3 className="w-8 h-8 text-amber-500" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </span>
            </div>
          </div>

          {/* Message */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-3">
              Your identity has been verified successfully
            </h2>
            <p className="text-sm text-surface-500 dark:text-surface-400 leading-relaxed">
              Your account requires administrator approval before accessing PricePilot AI.
              Your request has been sent to the administrator.
            </p>
          </div>

          {/* Email */}
          {email && (
            <div className="p-3 rounded-lg bg-surface-50 dark:bg-surface-700/40 border border-surface-200 dark:border-surface-700 text-center mb-6">
              <p className="text-xs uppercase tracking-wide text-surface-400 mb-1">Request submitted for</p>
              <p className="text-sm font-semibold text-surface-900 dark:text-white break-all">{email}</p>
              {name && <p className="text-xs text-surface-400 mt-0.5">{name}</p>}
            </div>
          )}

          {/* Next steps */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800">
              <CheckCircle2 className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-surface-600 dark:text-surface-300">
                An administrator will review your request. Once approved, you'll be able to sign in with the same credentials.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Link to="/login" className="btn-primary w-full justify-center">
              <ArrowLeft className="w-4 h-4" />
              Back to Sign in
            </Link>
            <p className="text-center text-xs text-surface-400">
              Need help? Contact your administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
