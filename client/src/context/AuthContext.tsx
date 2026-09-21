import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { apiRequest } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  registerCustomer: (data: any) => Promise<User>;
  registerWorker: (data: any) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updatePendingStep: (step: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('task_unity_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const storedToken = localStorage.getItem('task_unity_token');
    if (!storedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await apiRequest('/auth/me');
      if (data.success && data.user) {
        setUser({
          user_id: data.user.user_id,
          role: data.user.role,
          name: data.user.name,
          email: data.user.email,
          phone: data.user.phone,
          language: data.user.language,
          account_status: data.user.account_status,
          worker_id: data.user.worker?.worker_id,
          customer_id: data.user.customer?.customer_id,
          onboarding_status: data.user.worker?.onboarding_status,
          pending_step: data.user.pending_step
        });
      } else {
        logout();
      }
    } catch (err) {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, pass: string): Promise<User> => {
    const res = await apiRequest('/auth/login', 'POST', { email, password: pass });
    if (res.success && res.token && res.user) {
      localStorage.setItem('task_unity_token', res.token);
      setToken(res.token);
      const authUser: User = {
        user_id: res.user.user_id,
        role: res.user.role,
        name: res.user.name,
        email: res.user.email,
        phone: res.user.phone,
        language: res.user.language || 'en',
        account_status: 'ACTIVE',
        worker_id: res.user.worker_id,
        customer_id: res.user.customer_id,
        onboarding_status: res.user.onboarding_status,
        pending_step: res.user.pending_step
      };
      setUser(authUser);
      return authUser;
    }
    throw new Error(res.message || 'Login failed.');
  };

  const registerCustomer = async (data: any): Promise<User> => {
    const res = await apiRequest('/auth/register/customer', 'POST', data);
    if (res.success && res.token && res.user) {
      localStorage.setItem('task_unity_token', res.token);
      setToken(res.token);
      const authUser: User = {
        user_id: res.user.user_id,
        role: 'CUSTOMER',
        name: res.user.name,
        email: res.user.email,
        phone: res.user.phone,
        language: 'en',
        account_status: 'ACTIVE',
        customer_id: res.user.customer_id
      };
      setUser(authUser);
      return authUser;
    }
    throw new Error(res.message || 'Customer registration failed.');
  };

  const registerWorker = async (data: any): Promise<User> => {
    const res = await apiRequest('/auth/register/worker', 'POST', data);
    if (res.success && res.token && res.user) {
      localStorage.setItem('task_unity_token', res.token);
      setToken(res.token);
      const authUser: User = {
        user_id: res.user.user_id,
        role: 'WORKER',
        name: res.user.name,
        email: res.user.email,
        phone: res.user.phone,
        language: 'en',
        account_status: 'PENDING',
        worker_id: res.user.worker_id,
        onboarding_status: 'REGISTERED',
        pending_step: 'BASIC_PROFILE'
      };
      setUser(authUser);
      return authUser;
    }
    throw new Error(res.message || 'Worker registration failed.');
  };

  const logout = () => {
    localStorage.removeItem('task_unity_token');
    setToken(null);
    setUser(null);
  };

  const updatePendingStep = (step: string) => {
    if (user) {
      setUser({ ...user, pending_step: step });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        registerCustomer,
        registerWorker,
        logout,
        refreshUser,
        updatePendingStep
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
