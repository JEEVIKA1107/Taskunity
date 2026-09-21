import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';
import { AlertTriangle, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { ComplaintItem } from '../../types';

export interface ComplaintsPageProps {
  onBack?: () => void;
}

export const ComplaintsPage: React.FC<ComplaintsPageProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState('Payment Issue');
  const [priority, setPriority] = useState<'Normal' | 'Urgent' | 'Emergency'>('Normal');
  const [description, setDescription] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadComplaints = async () => {
    try {
      setIsLoading(true);
      const res = await apiRequest('/complaints');
      if (res.success && res.complaints) {
        setComplaints(res.complaints);
      }
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!description.trim()) {
      setError('Please provide a detailed description of the complaint.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiRequest('/complaints', 'POST', {
        category,
        priority,
        description,
        booking_id: bookingId || null
      });

      if (res.success) {
        setMessage(`Complaint registered successfully. Case ID: ${res.complaint_id}`);
        setDescription('');
        setBookingId('');
        setShowForm(false);
        loadComplaints();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  const workerCategories = [
    'Payment Issue',
    'Customer Behaviour',
    'Unsafe Working Condition',
    'Wrong Job Information',
    'Job Cancellation',
    'Location Problem',
    'Platform Problem',
    'Cooperative Issue',
    'Insurance Issue',
    'Other'
  ];

  const customerCategories = [
    'Worker Behaviour',
    'Poor Service',
    'Worker Did Not Arrive',
    'Incorrect Pricing',
    'Payment Problem',
    'Service Quality',
    'Safety Concern',
    'Platform Problem',
    'Other'
  ];

  const categories = user?.role === 'CUSTOMER' ? customerCategories : workerCategories;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          {onBack && (
            <button
              onClick={onBack}
              className="text-xs font-bold text-coop-600 hover:text-coop-800 mb-2 flex items-center space-x-1"
            >
              <span>← Back to Dashboard</span>
            </button>
          )}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-black text-slate-900">COMPLAINTS</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Independent cooperative grievance resolution desk (Available anytime, never forced).
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-red-100"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{showForm ? 'Cancel Filing' : 'File Complaint'}</span>
        </button>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Complaint Filing Form (Section 42) */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-red-50/50 border border-red-200 space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Register Dispute or Grievance
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="Normal">Normal (Response within 24-48h)</option>
                <option value="Urgent">Urgent (Response within 12h)</option>
                <option value="Emergency">Emergency (Immediate escalation)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Related Booking ID (Optional)
            </label>
            <input
              type="text"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="e.g. bk-12345"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Complaint Description & Facts
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Clearly specify dates, individuals involved, what happened, and requested redressal..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition"
          >
            {submitting ? 'Registering...' : 'REGISTER COMPLAINT'}
          </button>
        </form>
      )}

      {/* Complaints List (Section 42) */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800">Complaints Register</h2>
        {isLoading ? (
          <div className="text-center py-6 text-slate-400 text-xs">Loading complaints register...</div>
        ) : complaints.length > 0 ? (
          complaints.map((cmp) => (
            <div key={cmp.complaint_id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900 font-mono">{cmp.complaint_id}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    cmp.priority === 'Emergency'
                      ? 'bg-red-100 text-red-800'
                      : cmp.priority === 'Urgent'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {cmp.priority}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                  cmp.status === 'Resolved' || cmp.status === 'Closed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {cmp.status}
                </span>
              </div>

              <div className="text-slate-600 font-semibold">{cmp.category}</div>
              <p className="text-slate-700">{cmp.description}</p>
              {cmp.admin_notes && (
                <div className="mt-2 p-2.5 bg-white rounded-xl border border-slate-200 text-[11px] text-red-800">
                  <span className="font-bold">Cooperative Support Action:</span> {cmp.admin_notes}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs">
            No complaints filed.
          </div>
        )}
      </div>
    </div>
  );
};
