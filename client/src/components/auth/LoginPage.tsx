import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Users, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

interface LoginPageProps {
  onNavigateToRegister: () => void;
  onOpenForgotPassword?: () => void;
  onForgotPassword?: () => void;
  onLoginSuccess?: (user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigateToRegister,
  onOpenForgotPassword,
  onForgotPassword,
  onLoginSuccess
}) => {
  const { login } = useAuth();
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter your registered email and password.');
      return;
    }

    try {
      setIsLoading(true);
      const user = await login(email, password);
      if (onLoginSuccess) onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl border border-slate-200">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-coop-600 text-white shadow-xl shadow-coop-100 mb-3">
            <Users className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">TASK UNITY</h1>
          <p className="text-xs font-bold text-coop-700 tracking-wide uppercase mt-1">
            {t('coop_badge')}
          </p>
          <h2 className="text-base font-bold text-slate-700 mt-3">{t('welcome_back')}</h2>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {t('email_address')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 focus:border-coop-500 text-sm outline-none transition"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t('password')}
              </label>
              <button
                type="button"
                onClick={onOpenForgotPassword}
                className="text-xs text-coop-700 hover:text-coop-800 font-semibold hover:underline"
              >
                {t('forgot_password')}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 focus:border-coop-500 text-sm outline-none transition pr-10"
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

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center">
              <input
                id="showPasswordCheck"
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="rounded border-slate-300 text-coop-600 focus:ring-coop-500 h-4 w-4"
              />
              <label htmlFor="showPasswordCheck" className="ml-2 text-xs text-slate-600">
                {t('show_password')}
              </label>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onForgotPassword) onForgotPassword();
                else if (onOpenForgotPassword) onOpenForgotPassword();
              }}
              className="text-xs font-semibold text-coop-600 hover:text-coop-800"
            >
              {t('forgot_password')}?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-2xl bg-coop-600 hover:bg-coop-700 text-white font-bold text-sm shadow-md shadow-coop-100 transition flex items-center justify-center space-x-1"
          >
            <span>{isLoading ? 'Authenticating...' : t('login').toUpperCase()}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500 mb-2">{t('dont_have_account')}</p>
          <button
            type="button"
            onClick={onNavigateToRegister}
            className="w-full py-2.5 rounded-xl border-2 border-slate-200 hover:border-coop-600 text-slate-800 hover:text-coop-700 font-bold text-xs transition"
          >
            {t('create_account')}
          </button>
        </div>

        {/* Quick Demo Credentials for Testing All 22 Acceptance Tests */}
        <div className="mt-6 p-3 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2">
            Demo Test Profiles
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => handleQuickFill('lakshmi@example.com', 'Password123!')}
              className="p-1.5 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 text-left font-medium"
            >
              <div className="font-bold text-slate-800">Lakshmi</div>
              <div className="text-[10px] text-slate-500">Customer</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('raj@example.com', 'Password123!')}
              className="p-1.5 rounded-lg bg-white hover:bg-green-50 border border-slate-200 text-left font-medium"
            >
              <div className="font-bold text-slate-800">Raj Kumar</div>
              <div className="text-[10px] text-slate-500">Worker (Verified)</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('suresh@example.com', 'Password123!')}
              className="p-1.5 rounded-lg bg-white hover:bg-amber-50 border border-slate-200 text-left font-medium"
            >
              <div className="font-bold text-slate-800">Suresh Verma</div>
              <div className="text-[10px] text-slate-500">Worker (Incomplete)</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('admin@taskunity.org', 'AdminPass123!')}
              className="p-1.5 rounded-lg bg-white hover:bg-purple-50 border border-slate-200 text-left font-medium"
            >
              <div className="font-bold text-slate-800">Admin</div>
              <div className="text-[10px] text-slate-500">Administrator</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
