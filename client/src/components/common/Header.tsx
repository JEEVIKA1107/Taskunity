import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../../i18n/translations';
import { Globe, LogOut } from 'lucide-react';

interface HeaderProps {
  onOpenNotifications?: () => void;
  onNavigate?: (tab: string) => void;
  activeTab?: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNotifications: _onOpenNotifications, onNavigate, activeTab: _activeTab }) => {
  const { user, logout, login } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);

  const handleQuickLogin = async (email: string, pass: string, role?: string) => {
    try {
      setLoadingDemo(true);
      setShowDemoMenu(false);
      await login(email, pass, role);
    } catch (err: any) {
      alert(err.message || 'Login failed');
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand / Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate && onNavigate('dashboard')}>
            <div className="w-10 h-10 rounded-2xl bg-coop-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-coop-200">
              TU
            </div>
            <div>
              <div className="font-black text-lg tracking-tight text-slate-900 flex items-center space-x-1.5">
                <span>TASK UNITY</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-coop-100 text-coop-800">
                  Cooperative
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium tracking-wide">
                Verified Skills • 10% Social Welfare Pool
              </div>
            </div>
          </div>

          {/* Controls: Demo Accounts + Language Selector + User Info / Logout */}
          <div className="flex items-center space-x-3">
            {/* Quick Demo Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                disabled={loadingDemo}
                className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-coop-700 bg-coop-50 hover:bg-coop-100 border border-coop-200 rounded-lg transition"
              >
                <span>{loadingDemo ? 'Logging in...' : '⚡ Demo Accounts'}</span>
              </button>

              {showDemoMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 divide-y divide-slate-100">
                  <button
                    onClick={() => handleQuickLogin('priya.customer@taskunity.org', 'CustomerPass123!', 'CUSTOMER')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">Priya (Customer)</div>
                      <div className="text-[10px] text-slate-500">Service Booking & Tracking</div>
                    </div>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">CUSTOMER</span>
                  </button>

                  <button
                    onClick={() => handleQuickLogin('ramesh.electrician@taskunity.org', 'WorkerPass123!', 'WORKER')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">Ramesh (Electrician)</div>
                      <div className="text-[10px] text-slate-500">Verified Worker (Active)</div>
                    </div>
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">WORKER</span>
                  </button>

                  <button
                    onClick={() => handleQuickLogin('suresh.plumber@taskunity.org', 'WorkerPass123!', 'WORKER')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">Suresh (Plumber)</div>
                      <div className="text-[10px] text-slate-500">Incomplete Onboarding Resume</div>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">RESUME</span>
                  </button>

                  <button
                    onClick={() => handleQuickLogin('admin@taskunity.org', 'AdminPass123!', 'ADMIN')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">Administrator</div>
                      <div className="text-[10px] text-slate-500">Verifications & Claims</div>
                    </div>
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">ADMIN</span>
                  </button>
                </div>
              )}
            </div>

            {/* 7-Language Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 flex items-center text-xs font-semibold transition"
                title="Switch Language (7 Supported Languages)"
              >
                <Globe className="w-4 h-4 mr-1 text-coop-600" />
                <span className="uppercase">{language}</span>
              </button>

              {showLangMenu && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
                  {SUPPORTED_LANGUAGES.map((langOpt) => (
                    <button
                      key={langOpt.code}
                      onClick={() => {
                        setLanguage(langOpt.code);
                        setShowLangMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 ${
                        language === langOpt.code ? 'font-bold text-coop-700 bg-coop-50' : 'text-slate-700'
                      }`}
                    >
                      <span className="font-medium">{langOpt.nativeLabel}</span>
                      <span className="text-[10px] text-slate-400 uppercase">({langOpt.code})</span>
                      {language === langOpt.code && <span className="text-coop-600 font-bold ml-1">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User Profile / Logout */}
            {user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-800 leading-tight">{user.name}</div>
                  <div className="text-[10px] font-semibold text-coop-700">{user.role}</div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="p-2 text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                  title={t('logout')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('login')}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-coop-600 hover:bg-coop-700 rounded-lg shadow-sm transition"
              >
                {t('login')}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
