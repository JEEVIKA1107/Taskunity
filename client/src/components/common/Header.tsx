import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ShieldCheck, Globe, LogOut, Users } from 'lucide-react';

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

  const handleQuickLogin = async (email: string, pass: string) => {
    try {
      setLoadingDemo(true);
      setShowDemoMenu(false);
      await login(email, pass);
    } catch (err: any) {
      alert(err.message || 'Login failed');
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Cooperative Identity */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate && onNavigate('home')}>
            <div className="w-10 h-10 rounded-xl bg-coop-600 flex items-center justify-center text-white shadow-md shadow-coop-100">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-black tracking-tight text-slate-900">TASK UNITY</span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-coop-100 text-coop-800 border border-coop-300">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Cooperative
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-500 font-medium tracking-tight">
                {t('app_tagline')}
              </p>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Quick Demo Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 flex items-center transition"
                title="Switch demo scenarios for acceptance testing"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse mr-1.5" />
                {loadingDemo ? 'Switching...' : 'Quick Demo'}
              </button>

              {showDemoMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Demo Scenarios
                  </div>
                  <button
                    onClick={() => handleQuickLogin('lakshmi@example.com', 'Password123!')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">Lakshmi (Customer)</div>
                      <div className="text-[10px] text-slate-500">Book Fan Repair & Live Track</div>
                    </div>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">CUSTOMER</span>
                  </button>

                  <button
                    onClick={() => handleQuickLogin('raj@example.com', 'Password123!')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">Raj Kumar (Electrician)</div>
                      <div className="text-[10px] text-slate-500">Verified Worker (10% Contrib)</div>
                    </div>
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">WORKER</span>
                  </button>

                  <button
                    onClick={() => handleQuickLogin('suresh@example.com', 'Password123!')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">Suresh Verma (Worker)</div>
                      <div className="text-[10px] text-slate-500">Incomplete Onboarding Resume Test</div>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">RESUME</span>
                  </button>

                  <button
                    onClick={() => handleQuickLogin('admin@taskunity.org', 'AdminPass123!')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">Administrator</div>
                      <div className="text-[10px] text-slate-500">Verification & AI Forecasting</div>
                    </div>
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">ADMIN</span>
                  </button>
                </div>
              )}
            </div>

            {/* Language Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 flex items-center text-xs font-semibold transition"
                title="Switch Language (English / हिन्दी / தமிழ்)"
              >
                <Globe className="w-4 h-4 mr-1 text-coop-600" />
                <span className="uppercase">{language}</span>
              </button>

              {showLangMenu && (
                <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
                  <button
                    onClick={() => { setLanguage('en'); setShowLangMenu(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 ${language === 'en' ? 'font-bold text-coop-700 bg-coop-50' : 'text-slate-700'}`}
                  >
                    <span>English</span>
                    {language === 'en' && '✓'}
                  </button>
                  <button
                    onClick={() => { setLanguage('hi'); setShowLangMenu(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 ${language === 'hi' ? 'font-bold text-coop-700 bg-coop-50' : 'text-slate-700'}`}
                  >
                    <span>हिन्दी</span>
                    {language === 'hi' && '✓'}
                  </button>
                  <button
                    onClick={() => { setLanguage('ta'); setShowLangMenu(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 ${language === 'ta' ? 'font-bold text-coop-700 bg-coop-50' : 'text-slate-700'}`}
                  >
                    <span>தமிழ்</span>
                    {language === 'ta' && '✓'}
                  </button>
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
