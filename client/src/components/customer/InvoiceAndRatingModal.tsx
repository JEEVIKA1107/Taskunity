import React, { useState } from 'react';
import { Booking } from '../../types';
import { bookingsApi } from '../../services/api';

interface InvoiceAndRatingModalProps {
  booking: Booking;
  onClose: () => void;
  onComplete: () => void;
}

export const InvoiceAndRatingModal: React.FC<InvoiceAndRatingModalProps> = ({
  booking,
  onClose,
  onComplete,
}) => {
  const bookingId = booking.id || booking.booking_id;
  const isAlreadyPaid = booking.payment_status === 'PAID' || booking.invoice_status === 'PAID';

  const [step, setStep] = useState<'INVOICE' | 'RATING'>(
    isAlreadyPaid ? 'RATING' : 'INVOICE'
  );

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CASH' | 'CARD'>('UPI');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Rating state
  const [qualityRating, setQualityRating] = useState<number>(5);
  const [timelinessRating, setTimelinessRating] = useState<number>(5);
  const [review, setReview] = useState<string>('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);

  // Financial calculations
  const totalAmount = booking.final_amount || booking.estimated_amount || booking.total_amount || 450;
  const insuranceDeduction = booking.insurance_deduction || Math.round(totalAmount * 0.1);
  const serviceTitle = booking.service_name || booking.problem_title || 'Home Service';

  const handlePay = async () => {
    setPaying(true);
    setPayError(null);
    try {
      await bookingsApi.pay(bookingId, paymentMethod);
      setStep('RATING');
    } catch (err: any) {
      setPayError(err.message || 'Payment simulation failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRating(true);
    setRatingError(null);
    try {
      await bookingsApi.rate(bookingId, {
        rating: qualityRating,
        timeliness_rating: timelinessRating,
        review: review || 'Very satisfied with the cooperative service!',
      });
      alert('Thank you! Your dual rating helps strengthen worker cooperatives.');
      onComplete();
    } catch (err: any) {
      setRatingError(err.message || 'Failed to submit rating.');
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Step 1: Digital Invoice & Payment */}
        {step === 'INVOICE' && (
          <div>
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-coop-700 text-white flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold opacity-80">Official Cooperative Invoice</div>
                <h3 className="text-lg font-bold">Booking #{bookingId.slice(0, 8)}</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/20 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Worker & Service Banner */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <div className="text-xs text-slate-500 font-medium">Service Rendered</div>
                  <div className="text-sm font-bold text-slate-800">{serviceTitle}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Worker: {booking.worker_name || 'Raj Kumar'}</div>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
                  Completed
                </span>
              </div>

              {/* Itemized Bill Breakdown */}
              <div className="space-y-2.5 text-sm border-t border-b border-slate-100 py-4">
                <div className="flex justify-between text-slate-600">
                  <span>Standard Labor Charges</span>
                  <span className="font-semibold text-slate-800">₹{totalAmount}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <div className="flex items-center space-x-1">
                    <span>Task Unity Platform Fee</span>
                    <span className="text-[10px] bg-coop-100 text-coop-700 px-1 rounded font-bold">0% Coop</span>
                  </div>
                  <span className="font-semibold text-coop-700">₹0</span>
                </div>
                
                {/* 10% Insurance Highlight */}
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
                  <div className="flex justify-between font-bold">
                    <span>Worker Social Safety Contribution (10%)</span>
                    <span>₹{insuranceDeduction}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-700">
                    Transparently pooled to fund worker healthcare, accident coverage, and official government welfare schemes (PMJJBY / PMSBY).
                  </p>
                </div>

                <div className="flex justify-between items-center pt-2 font-bold text-base text-slate-900">
                  <span>Total Amount Due</span>
                  <span className="text-xl text-emerald-700 font-black">₹{totalAmount}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'UPI', label: 'UPI (GPay/PhonePe)', icon: '📱' },
                    { id: 'CASH', label: 'Cash on Delivery', icon: '💵' },
                    { id: 'CARD', label: 'Card / NetBanking', icon: '💳' },
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id as any)}
                      className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                        paymentMethod === method.id
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-800 ring-2 ring-emerald-500/20 font-bold'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      <span className="text-xl mb-1">{method.icon}</span>
                      <span className="text-xs font-semibold leading-tight">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {payError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                  {payError}
                </div>
              )}

              <button
                onClick={handlePay}
                disabled={paying}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-200 transition flex items-center justify-center space-x-2"
              >
                {paying ? (
                  <span>Processing Payment...</span>
                ) : (
                  <>
                    <span>Confirm & Pay ₹{totalAmount}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Dual Cooperative Rating */}
        {step === 'RATING' && (
          <div>
            <div className="p-5 bg-gradient-to-r from-coop-600 to-coop-800 text-white">
              <div className="text-xs uppercase tracking-wider font-semibold opacity-80">Task Unity Cooperative Feedback</div>
              <h3 className="text-lg font-bold">Rate Your Experience</h3>
              <p className="text-xs text-coop-100 mt-0.5">
                Our dual-rating system ensures accountability, transparency, and dignity for skilled workers.
              </p>
            </div>

            <form onSubmit={handleRatingSubmit} className="p-6 space-y-5">
              {/* Rating 1: Skill & Quality */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  1. Work Quality & Skill Mastery
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setQualityRating(star)}
                      className={`text-2xl transition transform hover:scale-110 ${
                        star <= qualityRating ? 'text-amber-400' : 'text-slate-200'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-600 ml-2">
                    {qualityRating === 5 ? 'Exceptional' : qualityRating === 4 ? 'Good' : qualityRating === 3 ? 'Average' : 'Needs Improvement'}
                  </span>
                </div>
              </div>

              {/* Rating 2: Timeliness & Conduct */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  2. Timeliness & Professional Conduct
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setTimelinessRating(star)}
                      className={`text-2xl transition transform hover:scale-110 ${
                        star <= timelinessRating ? 'text-amber-400' : 'text-slate-200'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-600 ml-2">
                    {timelinessRating === 5 ? 'Punctual & Courteous' : timelinessRating >= 4 ? 'On Time' : 'Delayed'}
                  </span>
                </div>
              </div>

              {/* Text Review */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Comments or Commendation (Optional)
                </label>
                <textarea
                  rows={3}
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Share details about the work done, punctuality, and professionalism..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-coop-500 focus:outline-none"
                />
              </div>

              {ratingError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                  {ratingError}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                >
                  Skip for Now
                </button>
                <button
                  type="submit"
                  disabled={submittingRating}
                  className="flex-1 py-3 rounded-xl bg-coop-600 hover:bg-coop-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-coop-200 transition"
                >
                  {submittingRating ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
