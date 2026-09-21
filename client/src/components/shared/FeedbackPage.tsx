import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';
import { MessageSquare, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { FeedbackItem } from '../../types';

export interface FeedbackPageProps {
  onBack?: () => void;
}

export const FeedbackPage: React.FC<FeedbackPageProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState('Mobile App');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadFeedback = async () => {
    try {
      setIsLoading(true);
      const res = await apiRequest('/feedback');
      if (res.success && res.feedback) {
        setFeedbackList(res.feedback);
      }
    } catch (err: any) {
      setError('Failed to fetch feedback history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!description.trim()) {
      setError('Please provide feedback description.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiRequest('/feedback', 'POST', {
        category,
        description
      });
      if (res.success) {
        setMessage('Feedback submitted successfully. Thank you for strengthening our cooperative.');
        setDescription('');
        setShowForm(false);
        loadFeedback();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    'Mobile App Experience',
    'Customer Experience',
    'Service Process & Tools',
    'Cooperative Welfare & Insurance',
    'Payouts & Billing',
    'Platform Improvement Suggestion',
    'Other Thoughts'
  ];

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
            <div className="w-8 h-8 rounded-xl bg-coop-100 text-coop-700 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-black text-slate-900">COOPERATIVE FEEDBACK</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Independent desk for continuous member feedback as <span className="font-semibold">{user?.role || 'Member'}</span>.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-coop-600 hover:bg-coop-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-coop-100"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{showForm ? 'Cancel Submission' : 'Provide Feedback'}</span>
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

      {showForm && (
        <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Share Your Cooperative Feedback
          </h2>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share your suggestion, praise, or suggestion for improvement..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-coop-600 hover:bg-coop-700 text-white font-bold text-xs shadow-md transition"
          >
            {submitting ? 'Submitting...' : 'SUBMIT FEEDBACK'}
          </button>
        </form>
      )}

      {/* List of Feedback (Section 41) */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800">My Feedback</h2>
        {isLoading ? (
          <div className="text-center py-6 text-slate-400 text-xs">Loading feedback history...</div>
        ) : feedbackList.length > 0 ? (
          feedbackList.map((f) => (
            <div key={f.feedback_id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800 font-mono">{f.feedback_id}</span>
                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                  f.status === 'Reviewed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {f.status}
                </span>
              </div>
              <div className="text-slate-500 font-semibold">{f.category}</div>
              <p className="text-slate-700">{f.description}</p>
              {f.admin_notes && (
                <div className="mt-2 p-2.5 bg-white rounded-xl border border-slate-200 text-[11px] text-coop-800">
                  <span className="font-bold">Cooperative Desk Note:</span> {f.admin_notes}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs">
            No feedback entries submitted yet.
          </div>
        )}
      </div>
    </div>
  );
};
