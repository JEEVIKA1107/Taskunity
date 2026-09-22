import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { X, Search, MapPin, Star, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Skill, Service } from '../../types';
import { SpeechToTextInput } from '../common/SpeechToTextInput';

interface BookingModalProps {
  initialSkillId?: string;
  onClose: () => void;
  onBookingSuccess: (bookingId: string) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  initialSkillId = 'sk-elec',
  onClose,
  onBookingSuccess
}) => {
  const [step, setStep] = useState<number>(1);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string>(initialSkillId);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [problemTitle, setProblemTitle] = useState('Broken ceiling fan wiring and motor humming');
  const [description, setDescription] = useState('The fan stopped spinning after a power fluctuation. Requires inspection and repair.');
  const [photoUrl, setPhotoUrl] = useState('/uploads/bookings/fan_issue.jpg');
  const [address, setAddress] = useState('14 Gandhipuram 4th Cross, Coimbatore');
  const [lat] = useState(11.0180);
  const [lng] = useState(76.9570);
  const [scheduledTime, setScheduledTime] = useState('Today, 10:30 AM');

  // Matching Engine
  const [matchedWorkers, setMatchedWorkers] = useState<any[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await apiRequest('/bookings/services');
        if (res.success) {
          setSkills(res.skills || []);
          setServices(res.services || []);
          // Auto select first matching service
          const firstMatching = (res.services || []).find((s: Service) => s.skill_id === selectedSkillId);
          if (firstMatching) {
            setSelectedServiceId(firstMatching.service_id);
          }
        }
      } catch (err) {
        console.error('Failed to load services:', err);
      }
    };
    fetchServices();
  }, [selectedSkillId]);

  const handleFindWorkers = async () => {
    try {
      setLoadingWorkers(true);
      setError('');
      const res = await apiRequest(`/bookings/match-workers?skillId=${selectedSkillId}&lat=${lat}&lng=${lng}`);
      if (res.success && res.workers) {
        setMatchedWorkers(res.workers);
        if (res.workers.length > 0) {
          setSelectedWorkerId(res.workers[0].worker_id);
        }
        setStep(2);
      }
    } catch (err: any) {
      setError('Matching engine search failed: ' + err.message);
    } finally {
      setLoadingWorkers(false);
    }
  };

  const handleConfirmBooking = async () => {
    try {
      setSubmitting(true);
      setError('');
      const res = await apiRequest('/bookings/create', 'POST', {
        serviceId: selectedServiceId,
        workerId: selectedWorkerId,
        problemTitle,
        description,
        photos: [photoUrl],
        customerAddress: address,
        customerLat: lat,
        customerLng: lng,
        scheduledTime
      });

      if (res.success && res.booking_id) {
        onBookingSuccess(res.booking_id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to place booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredServices = services.filter((s) => s.skill_id === selectedSkillId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="text-[10px] font-bold text-coop-800 bg-coop-100 px-2.5 py-0.5 rounded-full inline-block uppercase">
            Step {step} of 2 • Customer Booking
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1">Book a Cooperative Service</h2>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Service, Problem, Address Details */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Select Service Category
              </label>
              <select
                value={selectedSkillId}
                onChange={(e) => setSelectedSkillId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white font-medium outline-none"
              >
                {skills.map((s) => (
                  <option key={s.skill_id} value={s.skill_id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Specific Service / Problem
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white font-medium outline-none"
              >
                {filteredServices.map((srv) => (
                  <option key={srv.service_id} value={srv.service_id}>
                    {srv.name} — ₹{srv.base_price}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Problem Title
              </label>
              <input
                type="text"
                value={problemTitle}
                onChange={(e) => setProblemTitle(e.target.value)}
                placeholder="e.g. Ceiling Fan Repair"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs outline-none"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Description & Site Notes
                </label>
                <SpeechToTextInput
                  onTranscript={(spoken) => setDescription(prev => prev ? `${prev} ${spoken}` : spoken)}
                  className="text-xs font-bold text-coop-700 bg-coop-50 hover:bg-coop-100 px-2 py-0.5 rounded-lg flex items-center space-x-1 border border-coop-200 transition"
                />
              </div>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what needs to be fixed (or tap microphone to speak)..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Service Location
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs outline-none"
                  required
                />
                <span className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1" /> GPS
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Scheduled Time
                </label>
                <input
                  type="text"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Photo Attachment
                </label>
                <input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleFindWorkers}
              disabled={loadingWorkers}
              className="w-full py-3.5 rounded-2xl bg-coop-600 hover:bg-coop-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center space-x-2"
            >
              <Search className="w-4 h-4" />
              <span>{loadingWorkers ? 'Matching Nearby Workers...' : 'FIND VERIFIED WORKERS'}</span>
            </button>
          </div>
        )}

        {/* STEP 2: Matching Engine Results & Worker Selection */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">
                Verified Available Workers ({matchedWorkers.length})
              </h3>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-coop-700 font-bold hover:underline"
              >
                Change Details
              </button>
            </div>

            {matchedWorkers.length === 0 ? (
              <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-600 space-y-2">
                <div className="text-2xl">👷</div>
                <div className="font-bold text-slate-800 text-sm">No Available Workers Nearby</div>
                <p className="text-slate-500 max-w-xs mx-auto">
                  No verified workers for this service are currently active and available nearby. You can try a different category or check back in a few minutes.
                </p>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="mt-3 px-4 py-2 bg-coop-600 hover:bg-coop-700 text-white font-bold rounded-xl text-xs"
                >
                  Change Service Category
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {matchedWorkers.map((wrk) => {
                  const isSelected = selectedWorkerId === wrk.worker_id;
                  return (
                    <div
                      key={wrk.worker_id}
                      onClick={() => setSelectedWorkerId(wrk.worker_id)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'border-coop-600 bg-coop-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-sm">{wrk.name}</span>
                          <span className="inline-flex items-center text-[10px] font-bold bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                            <ShieldCheck className="w-3 h-3 mr-0.5" /> Verified
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {wrk.skill_name || 'Skilled Worker'} • {wrk.years_experience || 3} yrs exp • {wrk.jobs_completed || 0} jobs
                        </div>
                        <div className="flex items-center space-x-1 text-amber-500 text-xs font-bold mt-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{wrk.rating ? Number(wrk.rating).toFixed(1) : '5.0'} Rating</span>
                          <span className="text-slate-400 font-normal ml-2">
                            ~{wrk.distance_km ? `${wrk.distance_km} km away` : 'Within area'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-coop-600 bg-coop-600 text-white' : 'border-slate-300'
                        }`}>
                          {isSelected && '✓'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={handleConfirmBooking}
              disabled={submitting || !selectedWorkerId}
              className="w-full py-3.5 rounded-2xl bg-coop-600 hover:bg-coop-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center space-x-1"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>{submitting ? 'Sending Request...' : 'SEND BOOKING REQUEST'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
