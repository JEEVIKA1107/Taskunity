import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Users, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, Wrench, UserCheck, Shield } from 'lucide-react';
import { TextToSpeechButton } from '../common/TextToSpeechButton';
import { bhashiniService } from '../../services/bhashiniService';

export type LoginRole = 'WORKER' | 'CUSTOMER' | 'ADMIN';

interface LoginPageProps {
  onNavigateToRegister: (role?: 'WORKER' | 'CUSTOMER') => void;
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

  // Role Selection State (Priority 1)
  const [selectedRole, setSelectedRole] = useState<LoginRole | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const forgotPasswordHandler = onOpenForgotPassword || onForgotPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter your registered email and password.');
      return;
    }

    try {
      setIsLoading(true);
      // Pass the selected expectedRole to backend for strict RBAC verification
      const user = await login(email, password, selectedRole || undefined);
      if (onLoginSuccess) onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const bhashiniStatus = bhashiniService.getProviderStatus();

  // ==========================================
  // VIEW 1: ROLE SELECTION MUST COME FIRST
  // ==========================================
  if (!selectedRole) {
    const roleSelectionSpeech = `${t('who_are_you')} ${t('select_role_desc')}. Option 1: Worker. Option 2: Customer. Option 3: Administrator.`;

    return (
      <div className="min-h-[85vh] flex flex-col justify-center items-center p-4">
        <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-xl border border-slate-200">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-coop-600 text-white shadow-xl shadow-coop-100 mb-3">
              <Users className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">{t('app_title')}</h1>
            <p className="text-xs font-bold text-coop-700 tracking-wide uppercase mt-1">
              {t('coop_badge')}
            </p>

            <div className="mt-4 flex items-center justify-center space-x-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {t('who_are_you')}
              </h2>
              <TextToSpeechButton textToRead={roleSelectionSpeech} size="sm" />
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {t('select_role_desc')}
            </p>
          </div>

          {/* Role Cards Grid */}
          <div className="space-y-3.5">
            {/* ROLE 1: WORKER */}
            <button
              type="button"
              onClick={() => {
                setSelectedRole('WORKER');
                setError('');
                setEmail('');
                setPassword('');
              }}
              className="w-full text-left p-4 rounded-2xl border-2 border-slate-200 hover:border-coop-500 hover:bg-coop-50/50 transition group flex items-center space-x-4 shadow-sm hover:shadow-md"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xl group-hover:scale-105 transition flex-shrink-0">
                <Wrench className="w-6 h-6 text-emerald-700" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 text-base group-hover:text-coop-800">
                    {t('worker_role_title')}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Trade Pro
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                  {t('worker_role_desc')}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-coop-600 group-hover:translate-x-1 transition" />
            </button>

            {/* ROLE 2: CUSTOMER */}
            <button
              type="button"
              onClick={() => {
                setSelectedRole('CUSTOMER');
                setError('');
                setEmail('');
                setPassword('');
              }}
              className="w-full text-left p-4 rounded-2xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition group flex items-center space-x-4 shadow-sm hover:shadow-md"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xl group-hover:scale-105 transition flex-shrink-0">
                <UserCheck className="w-6 h-6 text-blue-700" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 text-base group-hover:text-blue-800">
                    {t('customer_role_title')}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Services
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                  {t('customer_role_desc')}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition" />
            </button>

            {/* ROLE 3: ADMINISTRATOR */}
            <button
              type="button"
              onClick={() => {
                setSelectedRole('ADMIN');
                setError('');
                setEmail('');
                setPassword('');
              }}
              className="w-full text-left p-4 rounded-2xl border-2 border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 transition group flex items-center space-x-4 shadow-sm hover:shadow-md"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xl group-hover:scale-105 transition flex-shrink-0">
                <Shield className="w-6 h-6 text-purple-700" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 text-base group-hover:text-purple-800">
                    {t('admin_role_title')}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    Cooperative
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                  {t('admin_role_desc')}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition" />
            </button>
          </div>

          {/* Quick Demo Fill Pills */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2">
              {t('demo_quick_login')}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('WORKER');
                  setEmail('ramesh.electrician@taskunity.org');
                  setPassword('WorkerPass123!');
                }}
                className="px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold text-center border border-emerald-200"
              >
                Ramesh (Worker)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('CUSTOMER');
                  setEmail('priya.customer@taskunity.org');
                  setPassword('CustomerPass123!');
                }}
                className="px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-[11px] font-bold text-center border border-blue-200"
              >
                Priya (Customer)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('ADMIN');
                  setEmail('admin@taskunity.org');
                  setPassword('AdminPass123!');
                }}
                className="px-2 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-[11px] font-bold text-center border border-purple-200"
              >
                Admin Board
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: ROLE-SPECIFIC LOGIN PAGE
  // ==========================================
  const roleTitle =
    selectedRole === 'WORKER'
      ? t('worker_login_title')
      : selectedRole === 'CUSTOMER'
      ? t('customer_login_title')
      : t('admin_login_title');

  const roleAccentColor =
    selectedRole === 'WORKER'
      ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
      : selectedRole === 'CUSTOMER'
      ? 'border-blue-500 text-blue-700 bg-blue-50'
      : 'border-purple-500 text-purple-700 bg-purple-50';

  const loginInstructionsSpeech = `${roleTitle}. ${t('welcome_back')}. ${t('email_address')}, ${t('password')}.`;

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl border border-slate-200">
        {/* Back to Role Selection */}
        <div className="flex justify-between items-center mb-4">
          <button
            type="button"
            onClick={() => {
              setSelectedRole(null);
              setError('');
            }}
            className="text-xs font-bold text-coop-700 hover:text-coop-900 transition flex items-center space-x-1"
          >
            <span>{t('change_role')}</span>
          </button>
          <TextToSpeechButton textToRead={loginInstructionsSpeech} size="sm" />
        </div>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-coop-600 text-white shadow-lg shadow-coop-100 mb-2">
            <Users className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">TASK UNITY</h1>
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border mb-1">
            <span className={roleAccentColor}>{roleTitle}</span>
          </div>
          <p className="text-xs text-slate-500">{t('welcome_back')}</p>
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
              {selectedRole === 'ADMIN' ? t('admin_email') : t('email_address')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={selectedRole === 'ADMIN' ? 'admin@taskunity.org' : 'name@example.com'}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 focus:border-coop-500 text-sm outline-none transition"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {selectedRole === 'ADMIN' ? t('admin_password') : t('password')}
              </label>
              {forgotPasswordHandler && (
                <button
                  type="button"
                  onClick={forgotPasswordHandler}
                  className="text-xs text-coop-700 hover:text-coop-800 font-semibold hover:underline"
                >
                  {t('forgot_password')}
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 focus:border-coop-500 text-sm outline-none transition pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="showPasswordToggle"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="rounded text-coop-600 focus:ring-coop-500 mr-2"
            />
            <label htmlFor="showPasswordToggle" className="text-xs text-slate-600 cursor-pointer">
              {showPassword ? t('hide_password') : t('show_password')}
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-coop-600 hover:bg-coop-700 text-white font-bold rounded-xl shadow-lg shadow-coop-200 transition duration-150 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="text-xs font-semibold">{t('loading')}</span>
            ) : (
              <>
                <span>{t('login')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Create Account link (for Worker & Customer; Admin accounts are managed by Cooperative Board) */}
        {selectedRole !== 'ADMIN' ? (
          <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-2">
            <p className="text-xs text-slate-500">{t('dont_have_account')}</p>
            <button
              type="button"
              onClick={() => onNavigateToRegister(selectedRole)}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition"
            >
              {t('create_account')} ({selectedRole})
            </button>
          </div>
        ) : (
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              Admin credentials are authenticated with role-level cryptographic isolation.
            </p>
          </div>
        )}

        {/* Bhashini / Engine Status */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center space-x-1.5 text-[10px] text-slate-400">
          <ShieldCheck className="w-3 h-3 text-coop-500" />
          <span>{bhashiniStatus.name}</span>
        </div>
      </div>
    </div>
  );
};
