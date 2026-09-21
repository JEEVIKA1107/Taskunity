import React, { useState } from 'react';
import { apiRequest } from '../../services/api';
import { KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, X } from 'lucide-react';

interface ForgotPasswordModalProps {
  onClose: () => void;
  onSuccessReturnToLogin: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  onClose,
  onSuccessReturnToLogin
}) => {
  const [step, setStep] = useState<'REQUEST' | 'RESET' | 'SUCCESS'>('REQUEST');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Please enter your registered email address.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await apiRequest('/auth/forgot-password', 'POST', { email });
      if (res.success) {
        if (res.reset_token) {
          setToken(res.reset_token);
        }
        setStep('RESET');
      } else {
        setError(res.message || 'Failed to process request.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmNewPassword) {
      setError('Both password fields are required.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await apiRequest('/auth/reset-password', 'POST', {
        token,
        newPassword,
        confirmNewPassword
      });

      if (res.success) {
        setStep('SUCCESS');
      } else {
        setError(res.message || 'Password reset failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'REQUEST' && (
          <div>
            <div className="w-12 h-12 rounded-xl bg-coop-50 text-coop-700 flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">FORGOT PASSWORD</h2>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Enter your registered email address to receive a secure reset link / token.
            </p>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSendResetLink} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Registered Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 focus:border-coop-500 text-sm outline-none transition"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-coop-600 hover:bg-coop-700 text-white font-bold text-sm shadow-md shadow-coop-100 transition flex items-center justify-center"
              >
                {isLoading ? 'Processing...' : 'SEND RESET LINK / OTP'}
              </button>
            </form>
          </div>
        )}

        {step === 'RESET' && (
          <div>
            <div className="w-12 h-12 rounded-xl bg-coop-50 text-coop-700 flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">RESET PASSWORD</h2>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Set a strong new password for your Task Unity account.
            </p>

            {token && (
              <div className="mb-4 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 font-mono break-all">
                <span className="font-bold text-slate-800">Reset Token (Demo Verified):</span> {token}
              </div>
            )}

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 focus:border-coop-500 text-sm outline-none transition pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 focus:border-coop-500 text-sm outline-none transition"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  id="showPass"
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="rounded border-slate-300 text-coop-600 focus:ring-coop-500 h-4 w-4"
                />
                <label htmlFor="showPass" className="ml-2 text-xs text-slate-600">
                  Show Password
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-coop-600 hover:bg-coop-700 text-white font-bold text-sm shadow-md shadow-coop-100 transition flex items-center justify-center"
              >
                {isLoading ? 'Resetting...' : 'RESET PASSWORD'}
              </button>
            </form>
          </div>
        )}

        {step === 'SUCCESS' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">PASSWORD RESET SUCCESSFUL</h2>
            <p className="text-xs text-slate-500 mt-2 mb-6">
              Your password has been securely updated. Your account data, bookings, and onboarding status remain fully preserved.
            </p>
            <button
              type="button"
              onClick={onSuccessReturnToLogin}
              className="w-full py-3 rounded-xl bg-coop-600 hover:bg-coop-700 text-white font-bold text-sm shadow-md transition"
            >
              RETURN TO LOGIN
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
