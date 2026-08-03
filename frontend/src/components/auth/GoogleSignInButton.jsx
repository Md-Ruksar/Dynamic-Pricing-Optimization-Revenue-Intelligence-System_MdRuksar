import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Loader2 } from 'lucide-react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

/**
 * Google icon mark (official four-color G).
 */
function GoogleIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

/**
 * Reusable "Continue with Google" button.
 *
 * Uses the official @react-oauth/google GoogleLogin component (real Google OAuth
 * popup + ID token). The ID token is sent to the backend which verifies it
 * server-side - nothing is ever mocked or entered via prompt().
 *
 * If VITE_GOOGLE_CLIENT_ID is not configured, renders a clearly disabled
 * button so the login page never breaks.
 */
export default function GoogleSignInButton({ text = 'Continue with Google', className = '' }) {
  const { googleLogin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <button
        type="button"
        disabled
        title="Google Sign-In is not configured. Set VITE_GOOGLE_CLIENT_ID in frontend/.env"
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-400 dark:text-surface-500 cursor-not-allowed"
      >
        <GoogleIcon className="w-5 h-5 opacity-40" />
        <span className="text-sm font-medium">{text}</span>
      </button>
    );
  }

  const handleSuccess = async (credentialResponse) => {
    const idToken = credentialResponse?.credential;
    if (!idToken) return;
    setLoading(true);
    try {
      const result = await googleLogin(idToken);
      // Verified Google identity but awaiting admin approval - no session issued.
      if (result?.access_pending) {
        sessionStorage.setItem('pending_email', result.email || '');
        sessionStorage.setItem('pending_name', result.name || '');
        navigate('/access-pending', {
          state: { email: result.email, name: result.name, provider: result.provider },
        });
        return;
      }
      toast.success('Signed in with Google', `Welcome, ${result.full_name || result.email}`);
      navigate('/dashboard');
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      if (status === 403) {
        toast.error('Account unavailable', detail || 'Your account has been deactivated. Contact your administrator.');
      } else if (status === 401) {
        toast.error('Google sign-in failed', detail || 'Your Google token could not be verified. Please try again.');
      } else {
        toast.error('Google sign-in failed', detail || 'Could not sign in with Google right now. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleError = () => {
    toast.info('Sign-in cancelled', 'The Google sign-in window was closed before completion.');
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={handleError}
      useOneTap={false}
      render={({ onClick }) => (
        <button
          type="button"
          onClick={onClick}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-700 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
          ) : (
            <GoogleIcon />
          )}
          <span className="text-sm font-medium">
            {loading ? 'Signing in...' : text}
          </span>
        </button>
      )}
    />
  );
}
