import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { ForgotPasswordModal } from './components/auth/ForgotPasswordModal';
import { WorkerOnboarding } from './components/worker/WorkerOnboarding';
import { WorkerDashboard } from './components/worker/WorkerDashboard';
import { WorkerInsuranceDashboard } from './components/worker/WorkerInsuranceDashboard';
import { CustomerDashboard } from './components/customer/CustomerDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { FeedbackPage } from './components/shared/FeedbackPage';
import { ComplaintsPage } from './components/shared/ComplaintsPage';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

  // Navigation states
  const [authView, setAuthView] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('home');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-coop-600 flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-coop-200 animate-bounce mb-4">
          🤝
        </div>
        <h2 className="text-base font-bold text-slate-800">TASK UNITY</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to cooperative node...</p>
      </div>
    );
  }

  // Unauthenticated Flow
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Header onNavigate={() => setAuthView('LOGIN')} />
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          {authView === 'LOGIN' ? (
            <LoginPage
              onNavigateToRegister={() => setAuthView('REGISTER')}
              onForgotPassword={() => setShowForgotPassword(true)}
            />
          ) : (
            <RegisterPage
              onNavigateToLogin={() => setAuthView('LOGIN')}
            />
          )}
        </main>

        {showForgotPassword && (
          <ForgotPasswordModal
            onClose={() => setShowForgotPassword(false)}
            onSuccessReturnToLogin={() => {
              setShowForgotPassword(false);
              setAuthView('LOGIN');
            }}
          />
        )}
      </div>
    );
  }

  // Authenticated: Route by role
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        activeTab={activeTab}
        onNavigate={(tab) => setActiveTab(tab)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* ROLE 1: ADMINISTRATOR */}
        {user.role === 'ADMIN' && (
          <AdminDashboard />
        )}

        {/* ROLE 2: CUSTOMER */}
        {user.role === 'CUSTOMER' && (
          <>
            {activeTab === 'home' && (
              <CustomerDashboard onNavigate={(tab) => setActiveTab(tab)} />
            )}
            {activeTab === 'feedback' && (
              <FeedbackPage onBack={() => setActiveTab('home')} />
            )}
            {activeTab === 'complaints' && (
              <ComplaintsPage onBack={() => setActiveTab('home')} />
            )}
          </>
        )}

        {/* ROLE 3: WORKER */}
        {user.role === 'WORKER' && (
          <>
            {/* If Worker is not yet fully activated, enforce 10-step Onboarding Machine */}
            {user.onboarding_status !== 'ACTIVE' ? (
              <WorkerOnboarding />
            ) : (
              /* If Worker is fully activated, provide access to Worker Dashboard */
              <>
                {activeTab === 'home' && (
                  <WorkerDashboard onNavigate={(tab) => setActiveTab(tab)} />
                )}
                {activeTab === 'insurance' && (
                  <WorkerInsuranceDashboard onBack={() => setActiveTab('home')} />
                )}
                {activeTab === 'feedback' && (
                  <FeedbackPage onBack={() => setActiveTab('home')} />
                )}
                {activeTab === 'complaints' && (
                  <ComplaintsPage onBack={() => setActiveTab('home')} />
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
      />
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
