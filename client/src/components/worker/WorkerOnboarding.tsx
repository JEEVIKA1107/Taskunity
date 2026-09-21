import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';
import {
  CheckCircle2,
  Clock,
  Shield,
  FileText,
  Award,
  Users,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Upload,
  RefreshCw,
  Info
} from 'lucide-react';
import { Skill, InsuranceScheme } from '../../types';

interface WorkerOnboardingProps {
  onOnboardingComplete?: () => void;
}

export const WorkerOnboarding: React.FC<WorkerOnboardingProps> = ({ onOnboardingComplete }) => {
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState<string>('BASIC_PROFILE');
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Skills list
  const [skills, setSkills] = useState<Skill[]>([]);
  const [schemes, setSchemes] = useState<InsuranceScheme[]>([]);
  const [onboardingData, setOnboardingData] = useState<any>(null);

  // Form State: Basic Profile
  const [dob, setDob] = useState('1994-06-15');
  const [gender, setGender] = useState('Male');
  const [address, setAddress] = useState('24 Gandhipuram Cross Road');
  const [district, setDistrict] = useState('Coimbatore');
  const [state, setState] = useState('Tamil Nadu');
  const [primarySkillId, setPrimarySkillId] = useState('sk-elec');
  const [secondarySkills] = useState<string[]>(['Technician']);
  const [yearsExperience, setYearsExperience] = useState(4);
  const [preferredWorkingArea, setPreferredWorkingArea] = useState('Coimbatore City');
  const [profilePhoto] = useState('/uploads/workers/default.jpg');

  // Form State: e-Shram
  const [hasEshram, setHasEshram] = useState<boolean | null>(null);
  const [eshramNumber, setEshramNumber] = useState('UAN-9842-1029-4581');
  const [eshramHolderName, setEshramHolderName] = useState('');
  const [eshramProofUrl, setEshramProofUrl] = useState('/uploads/docs/eshram_proof.pdf');

  // Form State: Skill Certification
  const [certPrimarySkill, setCertPrimarySkill] = useState('Electrician');
  const [certName, setCertName] = useState('NSDC Level 4 Electrician Competency Certificate');
  const [certNumber, setCertNumber] = useState('NSDC-ELEC-2022-901');
  const [certIssuingOrg, setCertIssuingOrg] = useState('National Skill Development Corporation');
  const [certIssueDate, setCertIssueDate] = useState('2022-03-10');
  const [certExpiryDate, setCertExpiryDate] = useState('2032-03-09');
  const [certDocumentUrl, setCertDocumentUrl] = useState('/uploads/docs/cert_proof.pdf');

  // Form State: Insurance Decision
  const [needsInsurance, setNeedsInsurance] = useState<boolean | null>(null);
  const [hasExistingInsurance, setHasExistingInsurance] = useState<boolean | null>(null);
  const [selectedScheme, setSelectedScheme] = useState<InsuranceScheme | null>(null);

  // Form State: Insurance Policy Details
  const [insProvider, setInsProvider] = useState('ABC General Insurance');
  const [insPolicyNumber, setInsPolicyNumber] = useState('POL-2026-458921');
  const [insPolicyHolder, setInsPolicyHolder] = useState('');
  const [insCoverage, setInsCoverage] = useState('₹2,00,000 Accidental & Disability Cover');
  const [insStartDate, setInsStartDate] = useState('2026-09-01');
  const [insEndDate, setInsEndDate] = useState('2027-08-31');
  const [insDocumentUrl, setInsDocumentUrl] = useState('/uploads/docs/policy_proof.pdf');

  // Mandatory Terms & Conditions Checkboxes (Section 14 & 17)
  const [consentTermsAccepted, setConsentTermsAccepted] = useState(false);
  const [consentAccuracyConfirmed, setConsentAccuracyConfirmed] = useState(false);
  const [consentNoPlatformIssuance, setConsentNoPlatformIssuance] = useState(false);
  const [consentProcessingGiven, setConsentProcessingGiven] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Load Onboarding State & Resume Logic
  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const [resStatus, resServices, resSchemes] = await Promise.all([
        apiRequest('/worker/onboarding-status'),
        apiRequest('/bookings/services'),
        apiRequest('/insurance/schemes')
      ]);

      if (resStatus.success) {
        setOnboardingData(resStatus.data);
        setCurrentStep(resStatus.data.pending_step);
        if (resStatus.data.worker) {
          if (resStatus.data.worker.dob) setDob(resStatus.data.worker.dob);
          if (resStatus.data.worker.address) setAddress(resStatus.data.worker.address);
          if (resStatus.data.worker.district) setDistrict(resStatus.data.worker.district);
          if (resStatus.data.worker.primary_skill_id) setPrimarySkillId(resStatus.data.worker.primary_skill_id);
          if (resStatus.data.worker.years_experience) setYearsExperience(resStatus.data.worker.years_experience);
        }
        if (resStatus.data.user) {
          setEshramHolderName(resStatus.data.user.name);
          setInsPolicyHolder(resStatus.data.user.name);
        }
        if (resStatus.data.pending_step === 'DASHBOARD') {
          if (onOnboardingComplete) onOnboardingComplete();
        }
      }

      if (resServices.success && resServices.skills) {
        setSkills(resServices.skills);
      }

      if (resSchemes.success && resSchemes.schemes) {
        setSchemes(resSchemes.schemes);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch onboarding state.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // 1. Submit Basic Profile
  const handleSubmitBasicProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      setSubmitting(true);
      const res = await apiRequest('/worker/basic-profile', 'POST', {
        dob,
        gender,
        address,
        district,
        state,
        profilePhoto,
        primarySkillId,
        secondarySkills,
        yearsExperience,
        preferredWorkingArea,
        languagePreference: user?.language || 'en'
      });
      if (res.success) {
        setSuccess('Basic Profile Saved ✓');
        setCurrentStep('ESHRAM');
        fetchStatus();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save profile.');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Submit e-Shram
  const handleSubmitEshram = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      setSubmitting(true);
      const res = await apiRequest('/worker/eshram', 'POST', {
        isRegistered: hasEshram,
        eshramNumber,
        holderName: eshramHolderName,
        documentUrl: eshramProofUrl
      });
      if (res.success) {
        setSuccess('e-Shram document submitted for admin verification ✓');
        setCurrentStep('ESHRAM_WAITING_VERIFICATION');
        fetchStatus();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit e-Shram details.');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Submit Skill Certification
  const handleSubmitCertification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      setSubmitting(true);
      const res = await apiRequest('/worker/certification', 'POST', {
        primarySkill: certPrimarySkill,
        certificationName: certName,
        certificateNumber: certNumber,
        issuingOrg: certIssuingOrg,
        issueDate: certIssueDate,
        expiryDate: certExpiryDate,
        documentUrl: certDocumentUrl,
        yearsExperience
      });
      if (res.success) {
        setSuccess('Certification submitted for review ✓');
        setCurrentStep('CERTIFICATION_WAITING_VERIFICATION');
        fetchStatus();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit certification.');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Submit Insurance Decision (YES / NO)
  const handleInsuranceDecision = async (need: boolean) => {
    setError('');
    try {
      setSubmitting(true);
      const res = await apiRequest('/worker/insurance-decision', 'POST', { needsInsurance: need });
      if (res.success) {
        if (!need) {
          // NO selected: skip insurance and advance to Cooperative Approval
          setSuccess('Insurance Not Enrolled. You can explore insurance and welfare options later.');
          setCurrentStep('COOPERATIVE_APPROVAL');
          fetchStatus();
        } else {
          setNeedsInsurance(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record insurance decision.');
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Submit Insurance Policy with Mandatory Consent
  const handleSubmitInsurancePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!consentTermsAccepted || !consentAccuracyConfirmed || !consentNoPlatformIssuance || !consentProcessingGiven) {
      setError('All 4 mandatory Terms & Conditions and consent checkboxes must be checked.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiRequest('/worker/insurance-submit', 'POST', {
        providerOrScheme: selectedScheme ? selectedScheme.name : insProvider,
        policyNumber: insPolicyNumber,
        policyHolderName: insPolicyHolder,
        coverage: insCoverage,
        startDate: insStartDate,
        endDate: insEndDate,
        documentUrl: insDocumentUrl,
        isExistingPolicy: hasExistingInsurance,
        termsAccepted: consentTermsAccepted,
        accuracyConfirmed: consentAccuracyConfirmed,
        noPlatformIssuanceUnderstood: consentNoPlatformIssuance,
        processingConsentGiven: consentProcessingGiven
      });

      if (res.success) {
        setSuccess('Insurance submitted for verification ✓ Status: PENDING.');
        setCurrentStep('INSURANCE_WAITING_VERIFICATION');
        fetchStatus();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit insurance details.');
    } finally {
      setSubmitting(false);
    }
  };

  // 6. Submit Contribution Choice (ONLY AFTER insurance is verified!)
  const handleContributionChoice = async (enable: boolean) => {
    setError('');
    try {
      setSubmitting(true);
      const res = await apiRequest('/worker/contribution-choice', 'POST', { enableContribution: enable });
      if (res.success) {
        setSuccess(res.message);
        setCurrentStep('COOPERATIVE_APPROVAL');
        fetchStatus();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record contribution preference.');
    } finally {
      setSubmitting(false);
    }
  };

  // Testing Trigger: Simulate Admin Verification for Test Automation
  const simulateAdminAction = async (type: 'ESHRAM' | 'CERT' | 'INSURANCE' | 'COOP', status: 'VERIFIED' | 'REJECTED' | 'APPROVE') => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('task_unity_token');
      // Execute admin verification endpoint via simulated admin call
      const adminLogin = await apiRequest('/auth/login', 'POST', { email: 'admin@taskunity.org', password: 'AdminPass123!' });
      const adminToken = adminLogin.token;

      if (type === 'ESHRAM' && onboardingData?.eshram) {
        await fetch(`/api/admin/eshram/${onboardingData.eshram.eshram_id}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
          body: JSON.stringify({ status, rejectionReason: status === 'REJECTED' ? 'Document unreadable.' : '' })
        });
      } else if (type === 'CERT' && onboardingData?.cert) {
        await fetch(`/api/admin/certifications/${onboardingData.cert.certification_id}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
          body: JSON.stringify({ status, rejectionReason: status === 'REJECTED' ? 'Certificate mismatch.' : '' })
        });
      } else if (type === 'INSURANCE' && onboardingData?.policy) {
        await fetch(`/api/admin/insurance/${onboardingData.policy.policy_id}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
          body: JSON.stringify({ status, rejectionReason: status === 'REJECTED' ? 'Policy document unclear.' : '' })
        });
      } else if (type === 'COOP' && onboardingData?.worker) {
        await fetch(`/api/admin/cooperative/${onboardingData.worker.worker_id}/approval`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
          body: JSON.stringify({ action: status, notes: 'Cooperative member criteria satisfied.' })
        });
      }

      // Restore worker token
      if (token) localStorage.setItem('task_unity_token', token);
      await fetchStatus();
    } catch (err: any) {
      alert('Simulation error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-coop-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Verifying onboarding state...</p>
      </div>
    );
  }

  // Define the 10-step progress visualization
  const stepsOrder = [
    { key: 'REGISTERED', label: '1. Registration' },
    { key: 'BASIC_PROFILE', label: '2. Profile' },
    { key: 'ESHRAM', label: '3. e-Shram' },
    { key: 'SKILL_CERTIFICATION', label: '4. Certification' },
    { key: 'INSURANCE_DECISION', label: '5. Insurance' },
    { key: 'INSURANCE_DETAILS', label: '6. Policy & Consent' },
    { key: 'INSURANCE_CONTRIBUTION', label: '7. Contribution' },
    { key: 'COOPERATIVE_APPROVAL', label: '8. Approval' }
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
      {/* Onboarding Flow Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-coop-100 text-coop-800 border border-coop-300 mb-2">
              <Shield className="w-3.5 h-3.5 mr-1" /> Cooperative Worker Onboarding
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Task Unity Worker Verification
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Complete each verification milestone to activate your cooperative membership.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Onboarding Stage</div>
            <div className="text-xs font-mono font-bold text-coop-800">
              {currentStep}
            </div>
          </div>
        </div>

        {/* Horizontal Progress Pipeline */}
        <div className="mt-6 overflow-x-auto pb-2">
          <div className="flex items-center min-w-[620px] justify-between text-xs">
            {stepsOrder.map((s, idx) => {
              const isCurrent = currentStep.startsWith(s.key);
              return (
                <div key={s.key} className="flex items-center">
                  <div className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                    isCurrent
                      ? 'bg-coop-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {s.label}
                  </div>
                  {idx < stepsOrder.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-slate-300 mx-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 rounded-xl bg-green-50 text-green-700 border border-green-200 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span className="font-bold">{success}</span>
          </div>
        )}
      </div>

      {/* STEP 1: Basic Profile */}
      {currentStep === 'BASIC_PROFILE' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Worker Basic Profile</h2>
          <p className="text-xs text-slate-500 mb-6">Enter your trade experience and contact details.</p>

          <form onSubmit={handleSubmitBasicProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Primary Skill
                </label>
                <select
                  value={primarySkillId}
                  onChange={(e) => {
                    setPrimarySkillId(e.target.value);
                    const sk = skills.find(s => s.skill_id === e.target.value);
                    if (sk) setCertPrimarySkill(sk.name);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none bg-white"
                  required
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
                  Years of Experience
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Residential Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Door No, Street Name, Landmark"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  District
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Preferred Working Area
              </label>
              <input
                type="text"
                value={preferredWorkingArea}
                onChange={(e) => setPreferredWorkingArea(e.target.value)}
                placeholder="e.g. Coimbatore City, RS Puram, Gandhipuram"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-coop-600 hover:bg-coop-700 text-white font-bold text-sm shadow-md transition"
            >
              {submitting ? 'Saving...' : 'SAVE & CONTINUE TO e-SHRAM'}
            </button>
          </form>
        </div>
      )}

      {/* STEP 2: e-Shram Decision & Verification */}
      {(currentStep === 'ESHRAM' || currentStep === 'ESHRAM_PENDING' || currentStep === 'ESHRAM_REJECTED') && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">e-Shram National Database Verification</h2>
              <p className="text-xs text-slate-500">Ministry of Labour & Employment Social Security Integration</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-6">
            <h3 className="text-sm font-bold text-slate-800 mb-3">
              “Are you already registered with e-Shram?”
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setHasEshram(true)}
                className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold text-xs transition flex items-center justify-center ${
                  hasEshram === true
                    ? 'border-coop-600 bg-coop-50 text-coop-800'
                    : 'border-slate-300 hover:border-slate-400 text-slate-700'
                }`}
              >
                [ YES, I AM REGISTERED ]
              </button>
              <button
                type="button"
                onClick={() => setHasEshram(false)}
                className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold text-xs transition flex items-center justify-center ${
                  hasEshram === false
                    ? 'border-coop-600 bg-coop-50 text-coop-800'
                    : 'border-slate-300 hover:border-slate-400 text-slate-700'
                }`}
              >
                [ NO, I AM NOT REGISTERED ]
              </button>
            </div>
          </div>

          {/* IF NO: Official Registration Guidance */}
          {hasEshram === false && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 mb-6 space-y-3">
              <div className="flex items-center space-x-2 text-amber-800 font-bold text-sm">
                <Info className="w-4 h-4" />
                <span>Official e-Shram Registration Guidance</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                e-Shram is the Government of India's national database of unorganised workers. Registering is free, takes 5 minutes using Aadhaar and mobile OTP, and provides accidental insurance cover.
              </p>
              <a
                href="https://eshram.gov.in"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition"
              >
                [ REGISTER FOR e-SHRAM ]
                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </a>
              <p className="text-[11px] text-amber-800">
                After completing official registration, return here and enter your 12-digit UAN number and upload proof.
              </p>
            </div>
          )}

          {/* e-Shram Details Form */}
          {hasEshram !== null && (
            <form onSubmit={handleSubmitEshram} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  12-Digit e-Shram Number (UAN)
                </label>
                <input
                  type="text"
                  value={eshramNumber}
                  onChange={(e) => setEshramNumber(e.target.value)}
                  placeholder="UAN-XXXX-XXXX-XXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm font-mono outline-none"
                  required={hasEshram === true}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Name as per e-Shram Card
                </label>
                <input
                  type="text"
                  value={eshramHolderName}
                  onChange={(e) => setEshramHolderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none"
                  required={hasEshram === true}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Upload e-Shram Proof / Document
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={eshramProofUrl}
                    onChange={(e) => setEshramProofUrl(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-xs font-mono outline-none"
                    required={hasEshram === true}
                  />
                  <span className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold flex items-center">
                    <Upload className="w-3.5 h-3.5 mr-1" /> PDF/JPG
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-600 flex items-center space-x-2">
                <Info className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span>Notice: Task Unity routes documents for authorized cooperative admin verification. No unauthorized claim of instant government API is made.</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-coop-600 hover:bg-coop-700 text-white font-bold text-sm shadow-md transition"
              >
                {submitting ? 'Submitting...' : 'SUBMIT e-SHRAM FOR VERIFICATION'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Waiting for e-Shram Approval */}
      {currentStep === 'ESHRAM_WAITING_VERIFICATION' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl font-black text-slate-900">e-Shram Verification Pending</h2>
          <p className="text-xs text-slate-500 mt-2 mb-6 max-w-md mx-auto">
            Your e-Shram document has been submitted and is currently under review by the cooperative administrator desk.
          </p>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block text-left mb-6 text-xs space-y-1">
            <div><span className="font-bold">UAN:</span> {onboardingData?.eshram?.eshram_number || eshramNumber}</div>
            <div><span className="font-bold">Status:</span> <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">PENDING</span></div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-center gap-3">
            <button
              type="button"
              onClick={fetchStatus}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
            >
              Check Status
            </button>
            {/* Quick Test Demo Trigger */}
            <button
              type="button"
              onClick={() => simulateAdminAction('ESHRAM', 'VERIFIED')}
              className="px-4 py-2.5 rounded-xl bg-coop-600 hover:bg-coop-700 text-white font-bold text-xs shadow-sm"
              title="Demo helper to test verification flow without logging into another browser"
            >
              [ DEMO: Admin Approve e-Shram ]
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Skill Certification */}
      {(currentStep === 'SKILL_CERTIFICATION' || currentStep === 'SKILL_CERTIFICATION_PENDING' || currentStep === 'CERTIFICATION_REJECTED') && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">SKILL CERTIFICATION</h2>
              <p className="text-xs text-slate-500">NSDC, ITI, or Authorized Trade Competency Verification</p>
            </div>
          </div>

          <form onSubmit={handleSubmitCertification} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Primary Skill
                </label>
                <input
                  type="text"
                  value={certPrimarySkill}
                  onChange={(e) => setCertPrimarySkill(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Years of Experience
                </label>
                <input
                  type="number"
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Certification Name
              </label>
              <input
                type="text"
                value={certName}
                onChange={(e) => setCertName(e.target.value)}
                placeholder="e.g. National Trade Certificate (NTC) / NSDC Level 4"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Certificate Number
                </label>
                <input
                  type="text"
                  value={certNumber}
                  onChange={(e) => setCertNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Issuing Organization
                </label>
                <input
                  type="text"
                  value={certIssuingOrg}
                  onChange={(e) => setCertIssuingOrg(e.target.value)}
                  placeholder="e.g. NSDC / ITI / Skill India"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={certIssueDate}
                  onChange={(e) => setCertIssueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={certExpiryDate}
                  onChange={(e) => setCertExpiryDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Upload Certificate Proof
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={certDocumentUrl}
                  onChange={(e) => setCertDocumentUrl(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-xs font-mono outline-none"
                  required
                />
                <span className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold flex items-center">
                  <Upload className="w-3.5 h-3.5 mr-1" /> Uploaded
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-coop-600 hover:bg-coop-700 text-white font-bold text-sm shadow-md transition"
            >
              {submitting ? 'Submitting...' : 'SUBMIT FOR VERIFICATION'}
            </button>
          </form>
        </div>
      )}

      {/* Waiting for Certification Approval */}
      {currentStep === 'CERTIFICATION_WAITING_VERIFICATION' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Skill Certification Under Review</h2>
          <p className="text-xs text-slate-500 mt-2 mb-6 max-w-md mx-auto">
            Your trade credentials and certificate details are undergoing verification by the cooperative technical panel.
          </p>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-center gap-3">
            <button
              type="button"
              onClick={fetchStatus}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
            >
              Check Status
            </button>
            <button
              type="button"
              onClick={() => simulateAdminAction('CERT', 'VERIFIED')}
              className="px-4 py-2.5 rounded-xl bg-coop-600 hover:bg-coop-700 text-white font-bold text-xs shadow-sm"
            >
              [ DEMO: Admin Verify Certification ]
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Insurance & Welfare Decision */}
      {currentStep === 'INSURANCE_DECISION' && needsInsurance === null && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">INSURANCE & WELFARE</h2>
              <p className="text-xs text-slate-500">Cooperative Social Protection & Accident Coverage</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-4 mb-6">
            <h3 className="text-base font-black text-slate-900">
              “Does the worker need insurance?”
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              You can enroll with an existing policy, join official government schemes (e.g. PMJJBY / PMSBY), or choose to skip for now.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleInsuranceDecision(true)}
                disabled={submitting}
                className="flex-1 py-3.5 rounded-xl bg-coop-600 hover:bg-coop-700 text-white font-bold text-xs shadow-md transition"
              >
                [ YES, I NEED INSURANCE ]
              </button>
              <button
                type="button"
                onClick={() => handleInsuranceDecision(false)}
                disabled={submitting}
                className="flex-1 py-3.5 rounded-xl border-2 border-slate-300 hover:border-slate-400 text-slate-700 font-bold text-xs transition"
              >
                [ NO, NOT NOW ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Existing Insurance vs Official Scheme */}
      {currentStep === 'INSURANCE_DECISION' && needsInsurance === true && hasExistingInsurance === null && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Existing Insurance Verification</h2>
          <p className="text-xs text-slate-500 mb-6">Do you already hold a valid insurance policy?</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setHasExistingInsurance(true)}
              className="p-5 rounded-2xl border-2 border-slate-200 hover:border-coop-600 hover:bg-coop-50/40 text-left transition group"
            >
              <div className="font-bold text-slate-900 group-hover:text-coop-700 mb-1">
                [ YES, I HAVE INSURANCE ]
              </div>
              <p className="text-xs text-slate-500">
                I already possess an active personal or group insurance policy.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setHasExistingInsurance(false)}
              className="p-5 rounded-2xl border-2 border-slate-200 hover:border-coop-600 hover:bg-coop-50/40 text-left transition group"
            >
              <div className="font-bold text-slate-900 group-hover:text-coop-700 mb-1">
                [ NO, I DON'T HAVE INSURANCE ]
              </div>
              <p className="text-xs text-slate-500">
                Explore eligible government insurance schemes and cooperative welfare options.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Official Schemes Directory (When worker does NOT have insurance) */}
      {currentStep === 'INSURANCE_DECISION' && needsInsurance === true && hasExistingInsurance === false && !selectedScheme && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">INSURANCE & WELFARE OPTIONS</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              You don't currently have insurance. Explore verified government social security schemes.
            </p>
          </div>

          <div className="space-y-3">
            {schemes.map((sch) => (
              <div key={sch.scheme_id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-coop-500 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{sch.name}</h3>
                    <p className="text-[11px] font-semibold text-coop-700">{sch.provider}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedScheme(sch);
                      setInsProvider(sch.name);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-coop-600 hover:bg-coop-700 text-white font-bold text-xs"
                  >
                    Select Scheme
                  </button>
                </div>
                <p className="text-xs text-slate-600 mt-2">{sch.benefits}</p>
                <div className="mt-3 flex items-center space-x-4 text-[11px] text-slate-500">
                  <span>Eligibility: {sch.eligibility}</span>
                  <a href={sch.official_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center">
                    Official Portal <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Official Scheme Enrollment Prompt */}
      {selectedScheme && hasExistingInsurance === false && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-4 mb-6">
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-2">
            <h3 className="text-sm font-bold text-blue-950">SCHEME DETAILS: {selectedScheme.name}</h3>
            <p className="text-xs text-blue-900"><span className="font-bold">Provider:</span> {selectedScheme.provider}</p>
            <p className="text-xs text-blue-900"><span className="font-bold">Benefits:</span> {selectedScheme.benefits}</p>
            <p className="text-xs text-blue-900"><span className="font-bold">Required Documents:</span> {selectedScheme.required_documents}</p>
            <a
              href={selectedScheme.official_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition"
            >
              [ GO TO OFFICIAL ENROLLMENT ]
              <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
            </a>
            <p className="text-[11px] text-blue-800 pt-1">
              After completing official registration, enter your policy or enrollment number below and submit for verification.
            </p>
          </div>
        </div>
      )}

      {/* STEP 6: Policy Information + MANDATORY TERMS & CONDITIONS CONSENT */}
      {(hasExistingInsurance === true || (selectedScheme && hasExistingInsurance === false)) && currentStep === 'INSURANCE_DECISION' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            {hasExistingInsurance ? 'Existing Policy Information' : 'Official Scheme Policy Information'}
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            The policy number is supplied by the insurer/authority. Task Unity does not generate insurance policies.
          </p>

          <form onSubmit={handleSubmitInsurancePolicy} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Insurance Provider / Scheme
                </label>
                <input
                  type="text"
                  value={insProvider}
                  onChange={(e) => setInsProvider(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Policy / Enrollment Number
                </label>
                <input
                  type="text"
                  value={insPolicyNumber}
                  onChange={(e) => setInsPolicyNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Policy Holder Name
                </label>
                <input
                  type="text"
                  value={insPolicyHolder}
                  onChange={(e) => setInsPolicyHolder(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Coverage
                </label>
                <input
                  type="text"
                  value={insCoverage}
                  onChange={(e) => setInsCoverage(e.target.value)}
                  placeholder="e.g. ₹2,00,000 Accidental Cover"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={insStartDate}
                  onChange={(e) => setInsStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={insEndDate}
                  onChange={(e) => setInsEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-sm outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Upload Policy Proof Document
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={insDocumentUrl}
                  onChange={(e) => setInsDocumentUrl(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-coop-500 text-xs font-mono outline-none"
                  required
                />
                <span className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold flex items-center">
                  <Upload className="w-3.5 h-3.5 mr-1" /> Uploaded
                </span>
              </div>
            </div>

            {/* MANDATORY INSURANCE TERMS & CONDITIONS CONSENT (Section 14 & 17) */}
            <div className="mt-6 p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-xs font-black text-slate-900 tracking-wide uppercase">
                  INSURANCE TERMS & CONDITIONS CONSENT
                </span>
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-[11px] text-coop-700 font-bold hover:underline"
                  >
                    [ VIEW TERMS & CONDITIONS ]
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPrivacyModal(true)}
                    className="text-[11px] text-coop-700 font-bold hover:underline"
                  >
                    [ VIEW PRIVACY POLICY ]
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 pt-1 text-xs text-slate-700">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentTermsAccepted}
                    onChange={(e) => setConsentTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-coop-600 focus:ring-coop-500 h-4 w-4"
                  />
                  <span className="ml-2.5">
                    I have read and agree to the Task Unity Insurance Terms & Conditions.
                  </span>
                </label>

                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentAccuracyConfirmed}
                    onChange={(e) => setConsentAccuracyConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-coop-600 focus:ring-coop-500 h-4 w-4"
                  />
                  <span className="ml-2.5">
                    I confirm that the insurance information and documents I have submitted are accurate to the best of my knowledge.
                  </span>
                </label>

                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentNoPlatformIssuance}
                    onChange={(e) => setConsentNoPlatformIssuance(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-coop-600 focus:ring-coop-500 h-4 w-4"
                  />
                  <span className="ml-2.5">
                    I understand that Task Unity does not issue or generate insurance policies.
                  </span>
                </label>

                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentProcessingGiven}
                    onChange={(e) => setConsentProcessingGiven(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-coop-600 focus:ring-coop-500 h-4 w-4"
                  />
                  <span className="ml-2.5">
                    I consent to Task Unity processing and storing the submitted insurance information and documents for verification, cooperative administration, and applicable platform services.
                  </span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={
                submitting ||
                !consentTermsAccepted ||
                !consentAccuracyConfirmed ||
                !consentNoPlatformIssuance ||
                !consentProcessingGiven
              }
              className={`w-full py-3.5 rounded-2xl font-bold text-sm shadow-md transition ${
                consentTermsAccepted &&
                consentAccuracyConfirmed &&
                consentNoPlatformIssuance &&
                consentProcessingGiven
                  ? 'bg-coop-600 hover:bg-coop-700 text-white shadow-coop-100'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {submitting ? 'Submitting...' : 'SUBMIT FOR VERIFICATION'}
            </button>
          </form>
        </div>
      )}

      {/* Waiting for Insurance Verification & Correction Resubmit Flow */}
      {(currentStep === 'INSURANCE_WAITING_VERIFICATION' || currentStep === 'INSURANCE_UNDER_REVIEW' || currentStep === 'INSURANCE_REJECTED') && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 text-center">
          {currentStep === 'INSURANCE_REJECTED' ? (
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
          )}

          <h2 className="text-xl font-black text-slate-900">
            {currentStep === 'INSURANCE_REJECTED' ? 'Insurance Verification Correction Required' : 'Insurance Verification Under Review'}
          </h2>

          {currentStep === 'INSURANCE_REJECTED' && (
            <div className="my-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-left text-xs text-red-800 space-y-1">
              <div className="font-bold">Rejection Reason from Cooperative Admin:</div>
              <div>{onboardingData?.policy?.rejection_reason || 'Policy document unclear.'}</div>
            </div>
          )}

          <p className="text-xs text-slate-500 mt-2 mb-6 max-w-md mx-auto">
            {currentStep === 'INSURANCE_REJECTED'
              ? 'Please update the unclear policy details, attach high-resolution proof, and re-confirm consent.'
              : 'Our cooperative administration is verifying your policy details and consent audit with the insurer authority.'}
          </p>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-center gap-3">
            {currentStep === 'INSURANCE_REJECTED' ? (
              <button
                type="button"
                onClick={() => setCurrentStep('INSURANCE_DECISION')}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
              >
                [ CORRECT DETAILS & RESUBMIT ]
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={fetchStatus}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  Check Status
                </button>
                <button
                  type="button"
                  onClick={() => simulateAdminAction('INSURANCE', 'VERIFIED')}
                  className="px-4 py-2.5 rounded-xl bg-coop-600 hover:bg-coop-700 text-white font-bold text-xs shadow-sm"
                >
                  [ DEMO: Admin Verify Insurance ]
                </button>
                <button
                  type="button"
                  onClick={() => simulateAdminAction('INSURANCE', 'REJECTED')}
                  className="px-4 py-2.5 rounded-xl bg-red-50 text-red-700 border border-red-300 font-bold text-xs hover:bg-red-100"
                >
                  [ DEMO: Admin Reject Insurance ]
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* STEP 7: Insurance Contribution Choice (ONLY AFTER Insurance Verification!) */}
      {currentStep === 'INSURANCE_CONTRIBUTION' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="inline-block px-2.5 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800 mb-2">
            Insurance Verified ✓
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">INSURANCE CONTRIBUTION</h2>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            Enable voluntary insurance contribution from eligible job earnings? The cooperative default prototype rate is 10% (configurable by Admin).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-green-50 border border-green-200 space-y-2">
              <div className="text-xs font-bold text-green-900">IF ENABLED (10%):</div>
              <div className="text-xs text-green-800 space-y-1 font-mono">
                <div>Service Payment: ₹1,000</div>
                <div>Contribution (10%): ₹100</div>
                <div>Net Eligible Earnings: ₹900</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-800">IF DISABLED:</div>
              <div className="text-xs text-slate-600 space-y-1 font-mono">
                <div>Service Payment: ₹1,000</div>
                <div>Contribution: ₹0</div>
                <div>Net Eligible Earnings: ₹1,000</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => handleContributionChoice(true)}
              disabled={submitting}
              className="flex-1 py-3.5 rounded-xl bg-coop-600 hover:bg-coop-700 text-white font-bold text-xs shadow-md transition"
            >
              [ YES, ENABLE ] (10% Contribution)
            </button>
            <button
              type="button"
              onClick={() => handleContributionChoice(false)}
              disabled={submitting}
              className="flex-1 py-3.5 rounded-xl border-2 border-slate-300 hover:border-slate-400 text-slate-700 font-bold text-xs transition"
            >
              [ NO, NOT NOW ] (₹0 Contribution)
            </button>
          </div>
        </div>
      )}

      {/* STEP 8: Cooperative Approval */}
      {currentStep === 'COOPERATIVE_APPROVAL' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 text-center">
          <div className="w-16 h-16 rounded-full bg-coop-100 text-coop-700 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900">COOPERATIVE APPROVAL</h2>
          <p className="text-xs text-slate-500 mt-2 mb-6 max-w-md mx-auto">
            All mandatory worker verifications have been submitted:
          </p>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 max-w-sm mx-auto text-left text-xs space-y-2 mb-6">
            <div className="flex justify-between items-center">
              <span>e-Shram:</span>
              <span className="font-bold text-green-700">✓ Verified</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Skill Certification:</span>
              <span className="font-bold text-green-700">✓ Verified</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Insurance:</span>
              <span className="font-bold text-coop-700">
                {onboardingData?.worker?.onboarding_status === 'INSURANCE_SKIPPED' ? 'Not Enrolled' : '✓ Active'}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-center gap-3">
            <button
              type="button"
              onClick={fetchStatus}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
            >
              Check Status
            </button>
            <button
              type="button"
              onClick={() => simulateAdminAction('COOP', 'APPROVE')}
              className="px-5 py-2.5 rounded-xl bg-coop-600 hover:bg-coop-700 text-white font-bold text-xs shadow-md"
            >
              [ DEMO: Admin Approve & Activate Worker ]
            </button>
          </div>
        </div>
      )}

      {/* Modal: Terms & Conditions */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-2">Task Unity Cooperative Insurance Terms</h3>
            <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <p>1. Task Unity is a cooperative-owned digital platform for skilled workers.</p>
              <p>2. Task Unity does not issue, generate, or underwrite insurance policies.</p>
              <p>3. Submitted insurance policies are issued solely by licensed third-party insurance providers or official government schemes.</p>
              <p>4. All policy contributions, if enabled, are credited into the worker insurance fund ledger strictly for policy maintenance and welfare claims.</p>
            </div>
            <button
              onClick={() => setShowTermsModal(false)}
              className="mt-5 w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Modal: Privacy Policy */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-2">Privacy & Document Consent</h3>
            <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <p>1. Worker documents, e-Shram records, and insurance certificates are stored securely and encrypted.</p>
              <p>2. Only authorized cooperative administrators can inspect documents for verification.</p>
              <p>3. Real-time GPS location is collected only when availability is toggled ON and shared with customers only during active bookings.</p>
            </div>
            <button
              onClick={() => setShowPrivacyModal(false)}
              className="mt-5 w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
