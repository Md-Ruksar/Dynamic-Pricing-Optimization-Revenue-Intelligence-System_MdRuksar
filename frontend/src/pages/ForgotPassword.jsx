import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authAPI } from '../api/client';
import {
  Sparkles, Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react';

export default function ForgotPassword() {
  const [step, setStep] = useState('email'); // 'email' | 'sent' | 'done'
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.forgotPassword(data.email);
      const token = res.data?.reset_token;
      if (token) {
        setResetToken(token);
        setStep('sent');
      } else {
        // Email not found but we don't reveal that
        setStep('done');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-50 via-primary-50/30 to-surface-50 dark:from-surface-950 dark:via-primary-950/20 dark:to-surface-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/25 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            Reset your password
          </h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            {step === 'email'
              ? 'Enter your email and we\'ll send you a reset link'
              : step === 'sent'
              ? 'Use the token below to reset your password'
              : 'Check your email for the reset link'}
          </p>
        </div>

        <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl border border-surface-200 dark:border-surface-700 p-8">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {step === 'email' && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="email"
                    className={`input pl-9 ${errors.email ? 'input-error' : ''}`}
                    placeholder="you@example.com"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^\S+@\S+$/i,
                        message: 'Please enter a valid email address',
                      },
                    })}
                  />
                </div>
                {errors.email && (
                  <p className="error-text">{errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          {step === 'sent' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                <p className="text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                  Your Reset Token
                </p>
                <div className="bg-white dark:bg-surface-900 rounded-lg p-3 font-mono text-xs text-surface-800 dark:text-surface-200 break-all select-all border border-primary-200 dark:border-primary-700">
                  {resetToken}
                </div>
                <p className="text-xs text-surface-500 mt-2">
                  Copy this token and use it on the reset password page. This token expires in 60 minutes.
                </p>
              </div>

              <Link
                to={`/reset-password?token=${encodeURIComponent(resetToken)}`}
                className="btn-primary w-full inline-flex items-center justify-center"
              >
                Go to Reset Password
              </Link>

              <button
                onClick={() => setStep('email')}
                className="btn-ghost w-full"
              >
                Send again
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm text-surface-600 dark:text-surface-300">
                If an account with that email exists, a reset link has been generated.
              </p>
              <Link
                to="/login"
                className="btn-primary inline-flex items-center justify-center w-full"
              >
                Back to Sign In
              </Link>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-surface-500 dark:text-surface-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
