import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Home, Briefcase, MapPin, DollarSign, Shield, MessageSquare, AlertTriangle } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  if (!user) return null;

  if (user.role === 'WORKER') {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg px-2 py-1 flex justify-around items-center">
        <button
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition ${activeTab === 'home' ? 'text-coop-600 font-bold' : 'text-slate-500'}`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>{t('my_jobs')}</span>
        </button>

        <button
          onClick={() => onTabChange('location')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition ${activeTab === 'location' ? 'text-coop-600 font-bold' : 'text-slate-500'}`}
        >
          <MapPin className="w-5 h-5 mb-0.5" />
          <span>{t('live_location')}</span>
        </button>

        <button
          onClick={() => onTabChange('earnings')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition ${activeTab === 'earnings' ? 'text-coop-600 font-bold' : 'text-slate-500'}`}
        >
          <DollarSign className="w-5 h-5 mb-0.5" />
          <span>{t('earnings')}</span>
        </button>

        <button
          onClick={() => onTabChange('insurance')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition ${activeTab === 'insurance' ? 'text-coop-600 font-bold' : 'text-slate-500'}`}
        >
          <Shield className="w-5 h-5 mb-0.5" />
          <span>{t('insurance_welfare')}</span>
        </button>

        <button
          onClick={() => onTabChange('complaints')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition ${activeTab === 'complaints' ? 'text-coop-600 font-bold' : 'text-slate-500'}`}
        >
          <AlertTriangle className="w-5 h-5 mb-0.5" />
          <span>{t('complaints')}</span>
        </button>
      </nav>
    );
  }

  if (user.role === 'CUSTOMER') {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg px-2 py-1 flex justify-around items-center">
        <button
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition ${activeTab === 'home' ? 'text-coop-600 font-bold' : 'text-slate-500'}`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => onTabChange('book')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition ${activeTab === 'book' ? 'text-coop-600 font-bold' : 'text-slate-500'}`}
        >
          <Briefcase className="w-5 h-5 mb-0.5" />
          <span>Book</span>
        </button>

        <button
          onClick={() => onTabChange('active')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition ${activeTab === 'active' ? 'text-coop-600 font-bold' : 'text-slate-500'}`}
        >
          <MapPin className="w-5 h-5 mb-0.5" />
          <span>Active</span>
        </button>

        <button
          onClick={() => onTabChange('history')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition ${activeTab === 'history' ? 'text-coop-600 font-bold' : 'text-slate-500'}`}
        >
          <DollarSign className="w-5 h-5 mb-0.5" />
          <span>History</span>
        </button>

        <button
          onClick={() => onTabChange('feedback')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition ${activeTab === 'feedback' ? 'text-coop-600 font-bold' : 'text-slate-500'}`}
        >
          <MessageSquare className="w-5 h-5 mb-0.5" />
          <span>Feedback</span>
        </button>
      </nav>
    );
  }

  return null;
};
