import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../lib/auth';
import { X, Mail, Sparkles, Loader2, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLinking?: boolean; // True if prompted to save guest trip
  customRedirectPath?: string;
}

export default function AuthModal({
  isOpen,
  onClose,
  isLinking = false,
  customRedirectPath,
}: AuthModalProps) {
  const { signInWithGoogle, signInWithOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogle = async () => {
    setError(null);
    setLoadingGoogle(true);
    try {
      const res = await signInWithGoogle(customRedirectPath);
      if (res.error) {
        setError(res.error.message);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign in failed');
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setError(null);
    setLoadingEmail(true);
    try {
      const res = await signInWithOtp(email, customRedirectPath);
      if (res.error) {
        setError(res.error.message);
      } else {
        setEmailSent(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setLoadingEmail(false);
    }
  };

  const modalElement = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass max-w-md w-full p-6 sm:p-7 rounded-2xl relative shadow-2xl border border-white/10 my-auto overflow-hidden">
        {/* Glow ambient accent */}
        <div
          className="pointer-events-none absolute -top-20 -right-20 w-48 h-48 rounded-full opacity-20 blur-2xl"
          style={{ background: 'radial-gradient(circle, #f95d0f, transparent 70%)' }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Close"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #ff7a38, #f95d0f)',
              boxShadow: '0 6px 20px rgba(249,93,15,0.35)',
            }}
          >
            <Sparkles size={22} color="white" />
          </div>

          <h3 className="font-display font-bold text-xl text-neutral-100">
            {isLinking ? 'Save Your Trip' : 'Welcome to WayMark'}
          </h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto leading-relaxed">
            {isLinking
              ? 'Sign in to access your trips, routes, and votes from any device.'
              : 'Sign in to access your saved trips, build live routes, and vote with friends.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs text-center">
            {error}
          </div>
        )}

        {emailSent ? (
          <div className="text-center py-5 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 size={24} />
            </div>
            <h4 className="font-display font-semibold text-neutral-100 text-base">
              Magic Link Sent!
            </h4>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto">
              We sent a secure login link to{' '}
              <span className="font-medium text-brand-400 text-neutral-200">{email}</span>.
              Click the link in your email to sign in instantly.
            </p>
            <button
              onClick={() => setEmailSent(false)}
              className="text-xs text-neutral-400 hover:text-neutral-200 underline mt-2"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Google OAuth Button */}
            <button
              onClick={handleGoogle}
              disabled={loadingGoogle || loadingEmail}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-medium text-sm transition-all shadow-sm relative group disabled:opacity-60 cursor-pointer"
              style={{
                background: '#ffffff',
                color: '#1a1a1a',
              }}
            >
              {loadingGoogle ? (
                <Loader2 size={18} className="animate-spin text-neutral-800" />
              ) : (
                <>
                  {/* Google standard colorful 'G' vector */}
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span className="font-semibold">
                    {isLinking ? 'Continue with Google to Save' : 'Continue with Google'}
                  </span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center py-1">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-surface-1 px-3 text-[11px] uppercase tracking-wider text-neutral-400 absolute font-medium">
                or with email link
              </span>
            </div>

            {/* Email Magic Link Form */}
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                  <Mail size={15} />
                </div>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loadingEmail || loadingGoogle}
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loadingEmail || loadingGoogle || !email.trim()}
                className="btn btn-secondary w-full text-xs font-semibold py-2.5 gap-2 cursor-pointer"
              >
                {loadingEmail ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Sending Magic Link…
                  </>
                ) : (
                  <>
                    <span>Send Magic Link</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            {/* Security note */}
            <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-neutral-400">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>Passwordless login • Safe & encrypted</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalElement, document.body);
}
