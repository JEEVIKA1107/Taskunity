import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';
import { Users, CheckCircle2, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { UserRole } from '../../types';

interface RegisterPageProps {
  onNavigateToLogin: () => void;
  onRegisteredSuccess?: (role: UserRole) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onNavigateToLogin,
  onRegisteredSuccess
}) => {
  const { registerCustomer, registerWorker } = useAuth();

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSendOtp = async () => {
    setError('');
    if (!phone || phone.trim().length < 10) {
      setError('Please enter a valid mobile number.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await apiRequest('/auth/send-otp', 'POST', { phone });
      if (res.success) {
        setOtpSent(true);
        if (res.demo_otp) {
          setDemoOtp(res.demo_otp);
          setOtp(res.demo_otp); // Pre-fill for ultra smooth acceptance testing
        }
      } else {
        setError(res.message || 'Failed to send OTP.');
      }
    } catch (err: any) {
      setError(err.message || 'Error sending OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    if (!otp || otp.trim().length !== 6) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await apiRequest('/auth/verify-otp', 'POST', { phone, otp });
      if (res.success) {
        setOtpVerified(true);
      } else {
        setError(res.message || 'Invalid OTP.');
      }
    } catch (err: any) {
      setError(err.message || 'OTP verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword || !phone) {
      setError('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (!otpVerified) {
      setError('Please verify your mobile number with OTP first.');
      return;
    }

    try {
      setIsLoading(true);
      if (selectedRole === 'CUSTOMER') {
        await registerCustomer({
          name,
          email,
          password,
          confirmPassword,
          phone,
          otp
        });
        setSuccessMessage('Customer Account Created ✓');
        setTimeout(() => {
          if (onRegisteredSuccess) onRegisteredSuccess('CUSTOMER');
        }, 900);
      } else if (selectedRole === 'WORKER') {
        await registerWorker({
          name,
          email,
          password,
          confirmPassword,
          phone,
          otp
        });
        setSuccessMessage('Worker Account Created ✓ Proceeding to Onboarding...');
        setTimeout(() => {
          if (onRegisteredSuccess) onRegisteredSuccess('WORKER');
        }, 900);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-xl border border-slate-200">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-coop-600 text-white shadow-lg shadow-coop-100 mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">TASK UNITY</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {selectedRole ? `Create ${selectedRole} Account` : 'Select Role to Create Account'}
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 mb-4 rounded-xl bg-green-50 text-green-700 border border-green-200 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span className="font-bold">{successMessage}</span>
          </div>
        )}

        {/* Step 1: Role Selection */}
        {!selectedRole && (
          <div className="space-y-4">
            <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Select Role
            </div>

            <button
              type="button"
              onClick={() => setSelectedRole('CUSTOMER')}
              className="w-full p-4 rounded-2xl border-2 border-slate-200 hover:border-coop-500 hover:bg-coop-50/50 transition flex items-center justify-between text-left group"
            >
              <div>
                <div className="font-bold text-slate-900 group-hover:text-coop-700">CUSTOMER</div>
                <div className="text-xs text-slate-500 mt-0.5">Book verified skilled workers for home & business services</div>
              </div>
              <span className="text-xl">🏠</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('WORKER')}
              className="w-full p-4 rounded-2xl border-2 border-slate-200 hover:border-coop-500 hover:bg-coop-50/50 transition flex items-center justify-between text-left group"
            >
              <div>
                <div className="font-bold text-slate-900 group-hover:text-coop-700">WORKER</div>
                <div className="text-xs text-slate-500 mt-0.5">Join the skilled workers cooperative, verify skills, and earn fair income</div>
              </div>
              <span className="text-xl">⚡</span>
            </button>

            <div className="pt-4 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-xs text-coop-700 font-bold hover:underline"
              >
                Already have an account? Login
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Registration Form */}
        {selectedRole && (
          <form onSubmit={handleRegister} className="space-y-4">
            <button
              type="button"
              onClick={() => setSelectedRole(null)}
              className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Change Role
            </button>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter full name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none transition"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none transition pr-8"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none transition"
                  required
                />
              </div>
            </div>

            {/* Mobile OTP Section */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mobile Number
                </label>
                <div className="flex space-x-2">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    disabled={otpVerified}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none bg-white transition"
                    required
                  />
                  {!otpVerified && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isLoading}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-sm transition flex-shrink-0"
                    >
                      {otpSent ? 'RESEND OTP' : 'SEND OTP'}
                    </button>
                  )}
                  {otpVerified && (
                    <span className="px-3 py-2 rounded-xl bg-green-100 text-green-800 text-xs font-bold flex items-center">
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Verified
                    </span>
                  )}
                </div>
              </div>

              {otpSent && !otpVerified && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      OTP Code
                    </label>
                    {demoOtp && (
                      <span className="text-[10px] text-coop-700 font-bold bg-coop-100 px-1.5 py-0.5 rounded">
                        Demo OTP: {demoOtp}
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="6-digit code"
                      className="w-36 px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm font-mono text-center tracking-widest outline-none bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={isLoading}
                      className="px-4 py-2 rounded-xl bg-coop-600 hover:bg-coop-700 text-white font-bold text-xs shadow-sm transition"
                    >
                      VERIFY OTP
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !otpVerified}
              className={`w-full py-3.5 rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center ${
                otpVerified
                  ? 'bg-coop-600 hover:bg-coop-700 text-white shadow-coop-100'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isLoading
                ? 'Creating Account...'
                : selectedRole === 'CUSTOMER'
                ? 'CREATE CUSTOMER ACCOUNT'
                : 'CREATE WORKER ACCOUNT'}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
              >
                Already have an account? <span className="text-coop-700 font-bold">Login</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
