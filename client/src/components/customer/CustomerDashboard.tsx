import React, { useEffect, useState } from 'react';
import { bookingsApi } from '../../services/api';
import { Booking } from '../../types';
import { BookingModal } from './BookingModal';
import { LiveTrackingModal } from './LiveTrackingModal';
import { InvoiceAndRatingModal } from './InvoiceAndRatingModal';

interface CustomerDashboardProps {
  onNavigate?: (page: string) => void;
}

const SERVICE_CATEGORIES = [
  { id: 'sk-elec', name: 'Electrician', icon: '⚡', desc: 'Wiring, switches, appliances & short circuits', baseRate: '₹350' },
  { id: 'sk-plumb', name: 'Plumbing', icon: '🔧', desc: 'Pipes, leakage, taps & sanitary installations', baseRate: '₹300' },
  { id: 'sk-carp', name: 'Carpentry', icon: '🪚', desc: 'Furniture repairs, doors, locks & custom woodwork', baseRate: '₹400' },
  { id: 'sk-paint', name: 'Painting', icon: '🎨', desc: 'Interior, exterior wall painting & touchups', baseRate: '₹500' },
  { id: 'sk-appliance', name: 'Appliance Repair', icon: '📺', desc: 'AC, Washing Machine, Refrigerator servicing', baseRate: '₹450' },
  { id: 'sk-clean', name: 'House Cleaning', icon: '🧹', desc: 'Deep home cleaning, kitchen & bathroom sanitation', baseRate: '₹600' },
];

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ onNavigate }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkillId, setSelectedSkillId] = useState<string>('sk-elec');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  
  // Tracking & Invoice Modals
  const [trackingBooking, setTrackingBooking] = useState<Booking | null>(null);
  const [invoiceBooking, setInvoiceBooking] = useState<Booking | null>(null);

  const fetchBookings = async () => {
    try {
      const res = await bookingsApi.getMyBookings();
      setBookings(res.bookings || []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, 8000);
    return () => clearInterval(interval);
  }, []);

  // Find active booking
  const activeBooking = bookings.find((b) =>
    ['REQUESTED', 'ACCEPTED', 'WORKER_TRAVELLING', 'ARRIVED', 'SERVICE_IN_PROGRESS'].includes(b.status)
  );

  const handleStartBooking = (skillId: string) => {
    setSelectedSkillId(skillId);
    setIsBookingModalOpen(true);
  };

  const handleBookingSuccess = (bookingId: string) => {
    setIsBookingModalOpen(false);
    fetchBookings().then(() => {
      bookingsApi.getById(bookingId).then((res) => {
        if (res.booking) {
          setTrackingBooking(res.booking);
        }
      });
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-coop-700 via-coop-600 to-emerald-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            <span>🤝 Cooperative-Owned Platform</span>
            <span>•</span>
            <span>100% Verified Workers</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Fair Services for You. <br className="hidden sm:inline" />
            Social Protection for Workers.
          </h1>
          <p className="text-coop-100 text-sm sm:text-base mt-2">
            Every booking through TASK UNITY automatically contributes 10% to our verified workers' official healthcare and welfare security pool.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleStartBooking('sk-elec')}
              className="px-5 py-2.5 rounded-xl bg-white text-coop-800 font-bold text-sm shadow-md hover:bg-slate-100 transition"
            >
              ⚡ Instant Electrician
            </button>
            <button
              onClick={() => handleStartBooking('sk-plumb')}
              className="px-5 py-2.5 rounded-xl bg-coop-800/60 hover:bg-coop-800 text-white font-bold text-sm border border-white/20 transition"
            >
              🔧 Book Plumber
            </button>
          </div>
        </div>

        {/* Decorative graphic element */}
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-12 translate-y-12">
          <svg className="w-80 h-80 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
      </div>

      {/* Active Live Booking Banner */}
      {activeBooking && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-3xl p-5 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl animate-pulse">
              📍
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-md">
                  Active Booking
                </span>
                <span className="text-xs font-semibold text-amber-100">
                  ETA: {activeBooking.eta_minutes || 12} mins
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                {activeBooking.service_name || activeBooking.problem_title} • Status: {activeBooking.status.replace(/_/g, ' ')}
              </h3>
              <p className="text-xs text-amber-100">
                Worker: {activeBooking.worker_name || 'Raj Kumar (Verified Electrician)'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setTrackingBooking(activeBooking)}
            className="w-full sm:w-auto px-6 py-2.5 bg-white text-amber-900 hover:bg-amber-50 rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 whitespace-nowrap"
          >
            <span>🗺️ Track Live & Status</span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          </button>
        </div>
      )}

      {/* Services Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Explore Skilled Services</h2>
            <p className="text-xs text-slate-500">Fixed cooperative rate cards • Zero surge pricing</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {SERVICE_CATEGORIES.map((service) => (
            <div
              key={service.id}
              onClick={() => handleStartBooking(service.id)}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-coop-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl p-2.5 bg-slate-50 rounded-xl border border-slate-100 group-hover:scale-110 transition-transform">
                    {service.icon}
                  </span>
                  <span className="text-xs font-bold text-coop-700 bg-coop-50 px-2.5 py-1 rounded-full border border-coop-100">
                    From {service.baseRate}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base group-hover:text-coop-600 transition">
                  {service.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {service.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-coop-600">
                <span>Book Verified Worker</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Booking History Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Your Booking History</h2>
            <p className="text-xs text-slate-500">Track current jobs, past invoices & dual ratings</p>
          </div>
          <button
            onClick={fetchBookings}
            className="text-xs text-coop-600 hover:text-coop-700 font-semibold flex items-center space-x-1"
          >
            <span>🔄 Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-xs">Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm font-semibold text-slate-600">No service bookings yet</p>
            <p className="text-xs text-slate-400 mt-1">Book an electrician or plumber to experience fair cooperative service.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Booking ID</th>
                  <th className="p-3">Service</th>
                  <th className="p-3">Worker</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {bookings.map((b) => {
                  const bId = b.id || b.booking_id;
                  const bAmount = b.final_amount || b.estimated_amount || b.total_amount || 450;
                  const bService = b.service_name || b.problem_title;
                  const isPaid = b.payment_status === 'PAID' || b.invoice_status === 'PAID';

                  return (
                    <tr key={bId} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 font-mono font-bold text-slate-600">
                        #{bId.slice(0, 8)}
                      </td>
                      <td className="p-3 font-semibold text-slate-900">
                        {bService}
                      </td>
                      <td className="p-3">
                        {b.worker_name || 'Assigned Worker'}
                      </td>
                      <td className="p-3 font-bold text-slate-900">
                        ₹{bAmount}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {b.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        {['REQUESTED', 'ACCEPTED', 'WORKER_TRAVELLING', 'ARRIVED', 'SERVICE_IN_PROGRESS'].includes(b.status) && (
                          <button
                            onClick={() => setTrackingBooking(b)}
                            className="px-3 py-1 rounded-lg bg-coop-600 text-white font-semibold text-xs hover:bg-coop-700 transition"
                          >
                            Live Track
                          </button>
                        )}
                        {b.status === 'COMPLETED' && !isPaid && (
                          <button
                            onClick={() => setInvoiceBooking(b)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition"
                          >
                            Pay Invoice
                          </button>
                        )}
                        {b.status === 'COMPLETED' && isPaid && !b.rating && (
                          <button
                            onClick={() => setInvoiceBooking(b)}
                            className="px-3 py-1 rounded-lg bg-amber-500 text-white font-semibold text-xs hover:bg-amber-600 transition"
                          >
                            Rate Worker ⭐
                          </button>
                        )}
                        {b.status === 'COMPLETED' && isPaid && b.rating && (
                          <span className="text-[11px] font-bold text-emerald-600">
                            Rated {b.rating}★
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Independent Desks Banner (Feedback & Complaints) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Have Feedback?</h4>
            <p className="text-xs text-slate-500">Share your overall cooperative experience</p>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('feedback')}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            Leave Feedback
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Grievance or Issue?</h4>
            <p className="text-xs text-slate-500">File a complaint with the dispute committee</p>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('complaints')}
            className="px-3 py-1.5 bg-white border border-red-200 rounded-xl text-xs font-semibold text-red-700 hover:bg-red-50 transition"
          >
            File Complaint
          </button>
        </div>
      </div>

      {/* Booking Modal */}
      {isBookingModalOpen && (
        <BookingModal
          initialSkillId={selectedSkillId}
          onClose={() => setIsBookingModalOpen(false)}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

      {/* Live Tracking Modal */}
      {trackingBooking && (
        <LiveTrackingModal
          booking={trackingBooking}
          onClose={() => setTrackingBooking(null)}
          onBookingUpdated={(upd) => {
            const updId = upd.id || upd.booking_id;
            setBookings((prev) => prev.map((x) => ((x.id || x.booking_id) === updId ? upd : x)));
            if (upd.status === 'COMPLETED') {
              setTrackingBooking(null);
              setInvoiceBooking(upd);
            }
          }}
          onProceedToInvoice={(bk) => {
            setTrackingBooking(null);
            setInvoiceBooking(bk);
          }}
        />
      )}

      {/* Invoice & Dual Rating Modal */}
      {invoiceBooking && (
        <InvoiceAndRatingModal
          booking={invoiceBooking}
          onClose={() => setInvoiceBooking(null)}
          onComplete={() => {
            setInvoiceBooking(null);
            fetchBookings();
          }}
        />
      )}

    </div>
  );
};
