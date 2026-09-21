import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { apiRequest } from '../../services/api';
import {
  ShieldCheck,
  Star,
  CheckCircle2,
  Shield,
  MapPin,
  Navigation
} from 'lucide-react';
import { WorkerInsuranceDashboard } from './WorkerInsuranceDashboard';
import { LeafletMap } from '../common/LeafletMap';
import { FeedbackPage } from '../shared/FeedbackPage';
import { ComplaintsPage } from '../shared/ComplaintsPage';

interface WorkerDashboardProps {
  onNavigate?: (tab: string) => void;
}

export const WorkerDashboard: React.FC<WorkerDashboardProps> = ({ onNavigate: _onNavigate }) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<string>('home');
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  // Worker coordinates (Coimbatore demo: 11.0168, 76.9558)
  const [workerLat, setWorkerLat] = useState(11.0168);
  const [workerLng, setWorkerLng] = useState(76.9558);

  const loadWorkerData = async () => {
    try {
      setIsLoading(true);
      const res = await apiRequest('/bookings/my-bookings');
      if (res.success && res.bookings) {
        setJobs(res.bookings);
        // Find active job if any
        const active = res.bookings.find((b: any) =>
          ['REQUESTED', 'ACCEPTED', 'WORKER_TRAVELLING', 'ARRIVED', 'SERVICE_IN_PROGRESS'].includes(b.status)
        );
        setActiveBooking(active || null);
      }
    } catch (err) {
      console.error('Failed to load worker jobs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkerData();
  }, []);

  const handleToggleAvailability = async (newVal: boolean) => {
    try {
      setIsAvailable(newVal);
      await apiRequest('/worker/availability', 'POST', {
        isAvailable: newVal,
        locationSharingEnabled: true
      });
    } catch (err: any) {
      alert('Failed to toggle availability: ' + err.message);
    }
  };

  const handleUpdateJobStatus = async (bookingId: string, status: string) => {
    try {
      setStatusUpdating(true);
      setActionSuccess('');

      // Slightly shift GPS coordinate to demonstrate movement during travel
      let newLat = workerLat;
      let newLng = workerLng;
      if (status === 'WORKER_TRAVELLING') {
        newLat = workerLat + 0.003;
        newLng = workerLng + 0.002;
        setWorkerLat(newLat);
        setWorkerLng(newLng);
      } else if (status === 'ARRIVED') {
        newLat = activeBooking?.customer_lat || 11.019;
        newLng = activeBooking?.customer_lng || 76.959;
        setWorkerLat(newLat);
        setWorkerLng(newLng);
      }

      const res = await apiRequest(`/bookings/${bookingId}/status`, 'PATCH', {
        status,
        lat: newLat,
        lng: newLng
      });

      if (res.success) {
        setActionSuccess(`Job status updated to ${status} ✓`);
        await loadWorkerData();
      }
    } catch (err: any) {
      alert('Status update failed: ' + err.message);
    } finally {
      setStatusUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-xs text-slate-400">
        Loading cooperative worker dashboard...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Header Card (Section 28) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {t('good_morning')}, {user?.name || 'Raj Kumar'}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                {t('verified_worker')}
              </span>
            </div>
            <div className="flex items-center space-x-3 mt-1.5 text-xs text-slate-500 font-medium">
              <span className="font-bold text-slate-800">Electrician</span>
              <span>•</span>
              <span className="flex items-center text-amber-500 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400 mr-1" />
                4.8 Rating
              </span>
              <span>•</span>
              <span>Coimbatore Cooperative Member</span>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex space-x-3 w-full md:w-auto">
            <div className="flex-1 md:flex-initial p-3 bg-coop-50 rounded-2xl border border-coop-200 text-center min-w-[110px]">
              <div className="text-[10px] font-bold text-coop-800 uppercase">{t('todays_earnings')}</div>
              <div className="text-base font-black text-coop-950">₹1,250</div>
            </div>
            <div className="flex-1 md:flex-initial p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center min-w-[100px]">
              <div className="text-[10px] font-bold text-slate-500 uppercase">{t('todays_jobs')}</div>
              <div className="text-base font-black text-slate-900">4</div>
            </div>
          </div>
        </div>

        {/* Status, Location Sharing & Badges Bar (Section 28 & 29) */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-2 ${isAvailable ? 'bg-green-500 animate-ping' : 'bg-slate-400'}`} />
              <span className="text-xs font-bold text-slate-900">
                {t('work_status')}: {isAvailable ? '🟢 AVAILABLE' : 'OFFLINE'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleToggleAvailability(!isAvailable)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm transition ${
                isAvailable
                  ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                  : 'bg-coop-600 text-white hover:bg-coop-700'
              }`}
            >
              {isAvailable ? t('go_offline') : t('go_available')}
            </button>
          </div>

          {/* Verification Badges */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="bg-green-100 text-green-800 px-2.5 py-1 rounded-lg flex items-center">
              <CheckCircle2 className="w-3 h-3 mr-1" /> ✓ e-Shram Verified
            </span>
            <span className="bg-green-100 text-green-800 px-2.5 py-1 rounded-lg flex items-center">
              <CheckCircle2 className="w-3 h-3 mr-1" /> ✓ Certification Verified
            </span>
            <span className="bg-coop-100 text-coop-800 px-2.5 py-1 rounded-lg flex items-center">
              <Shield className="w-3 h-3 mr-1" /> ✓ Insurance Active
            </span>
          </div>
        </div>

        {/* Navigation Tabs (Section 28) */}
        <div className="mt-6 flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          {[
            { id: 'home', label: 'Home' },
            { id: 'jobs', label: 'My Jobs' },
            { id: 'availability', label: 'Availability & Location' },
            { id: 'earnings', label: 'Earnings' },
            { id: 'insurance', label: 'Insurance & Welfare' },
            { id: 'feedback', label: 'Feedback' },
            { id: 'complaints', label: 'Complaints' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === tab.id
                  ? 'bg-coop-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-green-50 text-green-800 border border-green-200 text-xs font-bold flex items-center">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {actionSuccess}
        </div>
      )}

      {/* TAB: Home */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          {/* Active Job / Demo Scenario Card (Section 70 Demo: Lakshmi broken ceiling fan) */}
          {activeBooking ? (
            <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-coop-500 space-y-4 animate-in fade-in">
              <div className="flex justify-between items-start">
                <div>
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-coop-100 text-coop-800 mb-2 inline-block">
                    ACTIVE JOB IN PROGRESS
                  </span>
                  <h2 className="text-xl font-black text-slate-900">{activeBooking.problem_title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Customer: {activeBooking.customer_name || 'Lakshmi Narayanan'} • {activeBooking.customer_phone || '+91 98765 43210'}
                  </p>
                </div>

                <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-xl font-mono">
                  {activeBooking.status}
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                <div><span className="font-bold">Address:</span> {activeBooking.customer_address}</div>
                <div><span className="font-bold">Service Amount:</span> ₹{activeBooking.total_amount}</div>
                {activeBooking.description && (
                  <div><span className="font-bold">Problem Description:</span> {activeBooking.description}</div>
                )}
              </div>

              {/* Real-time status progression action bar */}
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Service Action Pipeline (Section 35 & 36)
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeBooking.status === 'REQUESTED' && (
                    <button
                      type="button"
                      disabled={statusUpdating}
                      onClick={() => handleUpdateJobStatus(activeBooking.booking_id, 'ACCEPTED')}
                      className="px-4 py-2.5 rounded-xl bg-coop-600 hover:bg-coop-700 text-white font-bold text-xs shadow-md"
                    >
                      [ ACCEPT JOB ]
                    </button>
                  )}

                  {activeBooking.status === 'ACCEPTED' && (
                    <button
                      type="button"
                      disabled={statusUpdating}
                      onClick={() => handleUpdateJobStatus(activeBooking.booking_id, 'WORKER_TRAVELLING')}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center"
                    >
                      <Navigation className="w-3.5 h-3.5 mr-1.5" />
                      [ START TRAVELLING TO CUSTOMER ]
                    </button>
                  )}

                  {activeBooking.status === 'WORKER_TRAVELLING' && (
                    <button
                      type="button"
                      disabled={statusUpdating}
                      onClick={() => handleUpdateJobStatus(activeBooking.booking_id, 'ARRIVED')}
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md"
                    >
                      [ ARRIVED AT LOCATION ]
                    </button>
                  )}

                  {activeBooking.status === 'ARRIVED' && (
                    <button
                      type="button"
                      disabled={statusUpdating}
                      onClick={() => handleUpdateJobStatus(activeBooking.booking_id, 'SERVICE_IN_PROGRESS')}
                      className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md"
                    >
                      [ START SERVICE ]
                    </button>
                  )}

                  {activeBooking.status === 'SERVICE_IN_PROGRESS' && (
                    <button
                      type="button"
                      disabled={statusUpdating}
                      onClick={() => handleUpdateJobStatus(activeBooking.booking_id, 'COMPLETED')}
                      className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs shadow-md flex items-center"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      [ COMPLETE SERVICE & GENERATE INVOICE ]
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Upcoming Job Card (Section 64) */
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t('upcoming_job')}
                </span>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-base font-bold text-slate-900">Fan Repair</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">10:30 AM</span>
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  14 Gandhipuram 4th Cross (1.4 km away)
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('jobs')}
                className="px-4 py-2.5 bg-coop-600 hover:bg-coop-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
              >
                {t('view_job')}
              </button>
            </div>
          )}

          {/* Live Location Preview */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">{t('live_location')}</h3>
                <p className="text-xs text-slate-500">
                  GPS coordinates are shared with the customer only during active assigned travel.
                </p>
              </div>
              <span className="text-xs bg-coop-100 text-coop-800 font-bold px-2.5 py-1 rounded-lg">
                Privacy Protected
              </span>
            </div>

            <LeafletMap
              workerLat={workerLat}
              workerLng={workerLng}
              customerLat={activeBooking?.customer_lat}
              customerLng={activeBooking?.customer_lng}
              statusText={activeBooking?.status || 'AVAILABLE'}
              etaMinutes={activeBooking?.status === 'ARRIVED' ? 0 : 12}
              height="300px"
            />
          </div>
        </div>
      )}

      {/* TAB: My Jobs */}
      {activeTab === 'jobs' && (
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">My Jobs History</h2>
          <div className="space-y-3">
            {jobs.length > 0 ? (
              jobs.map((job) => (
                <div key={job.booking_id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{job.problem_title}</div>
                      <div className="text-slate-500 mt-0.5">Booking ID: {job.booking_id}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-200 font-bold text-[10px]">
                      {job.status}
                    </span>
                  </div>
                  <div className="mt-2 text-slate-600">{job.customer_address}</div>
                  <div className="mt-3 flex justify-between items-center border-t border-slate-200 pt-2 font-mono text-[11px]">
                    <span>Total Amount: <strong>₹{job.total_amount}</strong></span>
                    {job.net_earnings && (
                      <span className="text-coop-700 font-bold">Net Earnings: ₹{job.net_earnings}</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                No jobs found in history.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Earnings (Section 38) */}
      {activeTab === 'earnings' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">WORKER EARNINGS BREAKDOWN</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Reflects service revenue and configured 10% voluntary cooperative insurance contribution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div className="text-slate-400 font-bold uppercase text-[10px]">Gross Earnings</div>
              <div className="text-2xl font-black text-slate-900">₹45,000</div>
              <div className="text-[11px] text-slate-500 pt-1">Total completed jobs revenue</div>
            </div>

            <div className="p-5 bg-purple-50 rounded-2xl border border-purple-200 text-xs space-y-1">
              <div className="text-purple-700 font-bold uppercase text-[10px]">Insurance Contribution (10%)</div>
              <div className="text-2xl font-black text-purple-900">₹2,200</div>
              <div className="text-[11px] text-purple-700 pt-1">Credited to Insurance Fund Ledger</div>
            </div>

            <div className="p-5 bg-green-50 rounded-2xl border border-green-200 text-xs space-y-1">
              <div className="text-green-800 font-bold uppercase text-[10px]">Net Eligible Earnings</div>
              <div className="text-2xl font-black text-green-950">₹42,800</div>
              <div className="text-[11px] text-green-700 pt-1">Directly payable to worker</div>
            </div>
          </div>

          {/* Sample Digital Invoice View */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-800 font-mono">Invoice No: INV-2026-00125</span>
              <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded font-bold">PAID</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-600">
              <div>Customer: Lakshmi Narayanan</div>
              <div>Worker: Raj Kumar (Electrician)</div>
              <div>Service: Electrician – Fan Repair</div>
              <div>Service Amount: ₹1,000</div>
              <div>Insurance Contribution (10%): ₹100</div>
              <div className="font-bold text-slate-900">Net Worker Earnings: ₹900</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Insurance & Welfare Dashboard */}
      {activeTab === 'insurance' && <WorkerInsuranceDashboard />}

      {/* TAB: Feedback */}
      {activeTab === 'feedback' && <FeedbackPage />}

      {/* TAB: Complaints */}
      {activeTab === 'complaints' && <ComplaintsPage />}
    </div>
  );
};
