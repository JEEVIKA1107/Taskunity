import React, { useEffect, useState } from 'react';
import { Booking } from '../../types';
import { LeafletMap } from '../common/LeafletMap';
import { bookingsApi } from '../../services/api';

interface LiveTrackingModalProps {
  booking: Booking;
  onClose: () => void;
  onBookingUpdated?: (updatedBooking: Booking) => void;
  onProceedToInvoice?: (booking: Booking) => void;
}

export const LiveTrackingModal: React.FC<LiveTrackingModalProps> = ({
  booking: initialBooking,
  onClose,
  onBookingUpdated,
  onProceedToInvoice,
}) => {
  const [booking, setBooking] = useState<Booking>(initialBooking);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const bookingId = booking.id || booking.booking_id;

  // Poll booking updates every 4 seconds
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await bookingsApi.getById(bookingId);
        if (res.booking) {
          setBooking(res.booking);
          if (onBookingUpdated) onBookingUpdated(res.booking);
        }
      } catch (err) {
        console.error('Failed to poll booking:', err);
      }
    };

    const timer = setInterval(fetchStatus, 4000);
    return () => clearInterval(timer);
  }, [bookingId, onBookingUpdated]);

  const handleCancelBooking = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking? Cooperative cancellation policy applies.')) {
      return;
    }
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await bookingsApi.updateStatus(bookingId, 'CANCELLED', 'Customer requested cancellation');
      setBooking(res.booking);
      if (onBookingUpdated) onBookingUpdated(res.booking);
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  // Status mapping
  const statusSteps = [
    { key: 'REQUESTED', label: 'Requested' },
    { key: 'ACCEPTED', label: 'Confirmed' },
    { key: 'WORKER_TRAVELLING', label: 'En Route' },
    { key: 'ARRIVED', label: 'Arrived' },
    { key: 'SERVICE_IN_PROGRESS', label: 'In Progress' },
    { key: 'COMPLETED', label: 'Completed' },
  ];

  const getStepIndex = (status: string) => {
    const idx = statusSteps.findIndex((s) => s.key === status);
    return idx === -1 ? 0 : idx;
  };

  const currentStepIdx = getStepIndex(booking.status);

  // Map coordinates
  const workerLat = booking.worker_lat || 13.0827;
  const workerLng = booking.worker_lng || 80.2707;
  const customerLat = booking.customer_lat || 13.0850;
  const customerLng = booking.customer_lng || 80.2780;
  const serviceName = booking.service_name || booking.problem_title || 'Home Service';
  const displayAmount = booking.final_amount || booking.estimated_amount || booking.total_amount || 450;
  const etaMins = booking.eta_minutes || 12;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-coop-600 to-coop-800 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase tracking-wider font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                ID: {bookingId.slice(0, 8)}
              </span>
              <span className="text-xs bg-emerald-400 text-emerald-950 font-bold px-2 py-0.5 rounded-full flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-ping mr-1"></span>
                LIVE
              </span>
            </div>
            <h2 className="text-lg font-bold mt-1 text-white">{serviceName}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition text-white/80 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          
          {/* Status Progression Bar */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between relative mb-2">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 w-full z-0" />
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-coop-500 transition-all duration-500 z-0"
                style={{ width: `${(currentStepIdx / (statusSteps.length - 1)) * 100}%` }}
              />
              {statusSteps.map((step, idx) => {
                const isPassed = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                return (
                  <div key={step.key} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                        isCurrent
                          ? 'bg-coop-600 border-white text-white ring-4 ring-coop-200 scale-110'
                          : isPassed
                          ? 'bg-coop-500 border-coop-500 text-white'
                          : 'bg-white border-slate-300 text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[11px] font-medium text-slate-500 px-0.5">
              <span>Booked</span>
              <span className="text-center">En Route</span>
              <span className="text-right">Completed</span>
            </div>
            <div className="mt-2 text-center text-xs font-bold text-coop-700 bg-coop-50 py-1 rounded-lg">
              Current Stage: {booking.status.replace(/_/g, ' ')}
            </div>
          </div>

          {/* Interactive Leaflet Map */}
          <div>
            <LeafletMap
              workerLat={workerLat}
              workerLng={workerLng}
              customerLat={customerLat}
              customerLng={customerLng}
              workerName={booking.worker_name || 'Assigned Worker'}
              customerAddress={booking.customer_address || 'Your Address'}
              statusText={booking.status.replace(/_/g, ' ')}
              etaMinutes={etaMins}
              height="240px"
            />
          </div>

          {/* Assigned Worker Profile Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-coop-100 border border-coop-200 text-coop-700 font-black text-xl flex items-center justify-center">
                {booking.worker_name ? booking.worker_name[0] : 'W'}
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h4 className="font-bold text-slate-900 text-sm">{booking.worker_name || 'Raj Kumar'}</h4>
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center">
                    ✓ Verified
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center space-x-2 mt-0.5">
                  <span>⭐ 4.9 (128 jobs)</span>
                  <span>•</span>
                  <span>Cooperative Member</span>
                </div>
              </div>
            </div>

            {/* Direct Call Button */}
            {booking.worker_phone && (
              <a
                href={`tel:${booking.worker_phone}`}
                className="w-10 h-10 rounded-xl bg-coop-50 text-coop-700 hover:bg-coop-600 hover:text-white transition flex items-center justify-center border border-coop-200 shadow-sm"
                title="Call Worker"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </a>
            )}
          </div>

          {/* Booking Info Box */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-slate-400 font-medium">Estimated Amount</div>
              <div className="text-base font-extrabold text-slate-800 mt-0.5">
                ₹{displayAmount}
              </div>
              <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Includes 10% Insurance Pool</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-slate-400 font-medium">Estimated Arrival</div>
              <div className="text-base font-extrabold text-coop-600 mt-0.5">
                {booking.status === 'COMPLETED' ? 'Done' : `${etaMins} mins`}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">Live tracking active</div>
            </div>
          </div>

          {cancelError && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
              {cancelError}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          {booking.status === 'COMPLETED' ? (
            <button
              onClick={() => onProceedToInvoice && onProceedToInvoice(booking)}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-200 transition flex items-center justify-center space-x-2"
            >
              <span>📄 View Digital Invoice & Pay</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          ) : (
            <>
              {(booking.status === 'REQUESTED' || booking.status === 'ACCEPTED') && (
                <button
                  onClick={handleCancelBooking}
                  disabled={cancelling}
                  className="w-full sm:w-auto text-xs text-red-600 hover:text-red-700 font-semibold py-2 px-4 rounded-lg hover:bg-red-50 transition"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Booking'}
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs transition"
              >
                Keep Tracking in Background
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
