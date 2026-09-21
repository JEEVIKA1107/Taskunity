import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { CheckCircle2, PlusCircle, ExternalLink } from 'lucide-react';
import { InsuranceClaim, InsuranceScheme, InsuranceContribution } from '../../types';

interface WorkerInsuranceDashboardProps {
  onBack?: () => void;
}

export const WorkerInsuranceDashboard: React.FC<WorkerInsuranceDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'POLICY' | 'CONTRIBUTIONS' | 'CLAIMS' | 'SCHEMES' | 'TERMS'>('POLICY');
  const [policyData, setPolicyData] = useState<any>(null);
  const [contributions, setContributions] = useState<InsuranceContribution[]>([]);
  const [contribSummary, setContribSummary] = useState<any>(null);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [schemes, setSchemes] = useState<InsuranceScheme[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Claim form state
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimType, setClaimType] = useState('Accident');
  const [incidentDate, setIncidentDate] = useState('2026-09-15');
  const [claimDescription, setClaimDescription] = useState('Minor wrist sprain while servicing high-voltage distribution switchboard.');
  const [claimAmount, setClaimAmount] = useState('3500');
  const [claimDocs, setClaimDocs] = useState('/uploads/claims/medical_receipt_1.pdf');
  const [claimAccuracyConfirmed, setClaimAccuracyConfirmed] = useState(false);
  const [claimConsentGiven, setClaimConsentGiven] = useState(false);
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimSuccessMsg, setClaimSuccessMsg] = useState('');
  const [claimError, setClaimError] = useState('');

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [resPolicy, resContrib, resClaims, resSchemes] = await Promise.all([
        apiRequest('/insurance/my-policy'),
        apiRequest('/insurance/contributions'),
        apiRequest('/insurance/my-claims'),
        apiRequest('/insurance/schemes')
      ]);

      if (resPolicy.success) setPolicyData(resPolicy);
      if (resContrib.success) {
        setContributions(resContrib.contributions || []);
        setContribSummary(resContrib.summary || {});
      }
      if (resClaims.success) setClaims(resClaims.claims || []);
      if (resSchemes.success) setSchemes(resSchemes.schemes || []);
    } catch (err) {
      console.error('Error loading insurance dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimError('');
    setClaimSuccessMsg('');

    if (!claimAccuracyConfirmed || !claimConsentGiven) {
      setClaimError('Both mandatory claim confirmation and processing consent checkboxes must be checked.');
      return;
    }

    try {
      setSubmittingClaim(true);
      const res = await apiRequest('/insurance/claims', 'POST', {
        claimType,
        incidentDate,
        description: claimDescription,
        documents: claimDocs,
        amountClaimed: Number(claimAmount),
        accuracyConfirmed: claimAccuracyConfirmed,
        processingConsentGiven: claimConsentGiven
      });

      if (res.success) {
        setClaimSuccessMsg('Insurance Claim Submitted Successfully ✓ Status: Submitted');
        setShowClaimForm(false);
        loadData();
      }
    } catch (err: any) {
      setClaimError(err.message || 'Failed to submit claim.');
    } finally {
      setSubmittingClaim(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Loading Insurance & Welfare details...
      </div>
    );
  }

  const policy = policyData?.policy;
  const isEnrolled = policyData?.insurance_status === 'VERIFIED';

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100">
          <div>
            {onBack && (
              <button
                onClick={onBack}
                className="text-xs font-bold text-coop-600 hover:text-coop-800 mb-2 flex items-center space-x-1"
              >
                <span>← Back to Dashboard</span>
              </button>
            )}
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 mb-2">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
              {isEnrolled ? '🟢 ACTIVE INSURANCE' : 'NOT ENROLLED'}
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              INSURANCE & WELFARE
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Cooperative Social Security & Health Protection
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-xs">
            <div className="text-slate-400 font-bold uppercase text-[10px]">Contribution Rate</div>
            <div className="font-bold text-coop-800 text-sm">
              {policyData?.contribution_enabled ? `${policyData?.configured_rate} ENABLED` : '0% DISABLED'}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 pt-4">
          <button
            type="button"
            onClick={() => setActiveTab('POLICY')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'POLICY'
                ? 'bg-coop-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            POLICY INFORMATION
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CONTRIBUTIONS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'CONTRIBUTIONS'
                ? 'bg-coop-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            CONTRIBUTION HISTORY
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CLAIMS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'CLAIMS'
                ? 'bg-coop-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            INSURANCE CLAIMS ({claims.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SCHEMES')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'SCHEMES'
                ? 'bg-coop-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            WELFARE / SCHEMES
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('TERMS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'TERMS'
                ? 'bg-coop-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            TERMS & CONDITIONS
          </button>
        </div>
      </div>

      {/* TAB 1: Policy Information */}
      {activeTab === 'POLICY' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">Policy Details</h2>
            <span className="text-xs bg-coop-100 text-coop-800 font-bold px-2.5 py-1 rounded-lg">
              Verified & Active
            </span>
          </div>

          {policy ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Provider / Scheme</div>
                <div className="text-slate-800 font-bold text-sm">{policy.provider_or_scheme}</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Policy / Enrollment Number</div>
                <div className="text-slate-800 font-bold text-sm font-mono">{policy.policy_number}</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Policy Holder</div>
                <div className="text-slate-800 font-bold text-sm">{policy.policy_holder_name}</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Coverage</div>
                <div className="text-slate-800 font-bold text-sm">{policy.coverage}</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Valid Until</div>
                <div className="text-slate-800 font-bold text-sm">{policy.expiry_date}</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Consent Audit Record</div>
                <div className="text-coop-800 font-bold text-sm flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-1 text-coop-600" />
                  ✓ Accepted ({policyData?.consent?.consent_version || 'v1.0'})
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <p className="text-xs text-slate-500">No active insurance policy enrolled.</p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3 text-xs">
            <button
              type="button"
              onClick={() => alert('Document download simulated: policy_raj.pdf')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl"
            >
              [ DOWNLOAD DOCUMENT ]
            </button>
            <button
              type="button"
              onClick={() => alert('Policy update requested to cooperative admin desk')}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50"
            >
              [ UPDATE / RENEW ]
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Contribution History */}
      {activeTab === 'CONTRIBUTIONS' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">CONTRIBUTION HISTORY</h2>
              <p className="text-xs text-slate-500 mt-0.5">Voluntary job deductions towards cooperative insurance fund</p>
            </div>

            <div className="flex space-x-3">
              <div className="p-3 bg-coop-50 rounded-2xl border border-coop-200 text-xs">
                <div className="text-[10px] text-coop-700 font-bold uppercase">This Month</div>
                <div className="text-base font-black text-coop-900">₹{contribSummary?.this_month || 800}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Total Contributions</div>
                <div className="text-base font-black text-slate-900">₹{contribSummary?.total_contributions || 4500}</div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Booking</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Rate</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {contributions.length > 0 ? (
                  contributions.map((c) => (
                    <tr key={c.contribution_id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{c.booking_id}</td>
                      <td className="py-3 px-4">₹{c.payment_amount}</td>
                      <td className="py-3 px-4 font-bold text-coop-700">{c.contribution_rate}%</td>
                      <td className="py-3 px-4 font-bold text-slate-900">₹{c.contribution_amount}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{c.transaction_reference}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      No contribution records recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Insurance Claims */}
      {activeTab === 'CLAIMS' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">INSURANCE CLAIMS</h2>
              <p className="text-xs text-slate-500 mt-0.5">Submit accident or hospital claims for cooperative settlement</p>
            </div>
            <button
              type="button"
              onClick={() => setShowClaimForm(!showClaimForm)}
              className="px-4 py-2 bg-coop-600 hover:bg-coop-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
              {showClaimForm ? 'Hide Form' : 'SUBMIT CLAIM'}
            </button>
          </div>

          {claimSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-green-50 text-green-800 border border-green-200 text-xs font-bold">
              {claimSuccessMsg}
            </div>
          )}

          {claimError && (
            <div className="p-3.5 rounded-2xl bg-red-50 text-red-800 border border-red-200 text-xs font-bold">
              {claimError}
            </div>
          )}

          {showClaimForm && (
            <form onSubmit={handleClaimSubmit} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">New Claim Filing</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Claim Type
                  </label>
                  <select
                    value={claimType}
                    onChange={(e) => setClaimType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="Accident">Accident / Workplace Injury</option>
                    <option value="Hospitalization">Hospitalization / Medical</option>
                    <option value="Disability">Temporary Disability</option>
                    <option value="Equipment">Tools & Equipment Replacement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Incident Date
                  </label>
                  <input
                    type="date"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description of Incident
                </label>
                <textarea
                  rows={3}
                  value={claimDescription}
                  onChange={(e) => setClaimDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Amount Claimed (₹)
                  </label>
                  <input
                    type="number"
                    value={claimAmount}
                    onChange={(e) => setClaimAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Upload Medical / Police Documents
                  </label>
                  <input
                    type="text"
                    value={claimDocs}
                    onChange={(e) => setClaimDocs(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              {/* Mandatory Claim Consent Checkboxes (Section 25) */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs text-slate-700">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={claimAccuracyConfirmed}
                    onChange={(e) => setClaimAccuracyConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-coop-600 focus:ring-coop-500 h-4 w-4"
                  />
                  <span className="ml-2">
                    I confirm that the information submitted in this claim is accurate to the best of my knowledge.
                  </span>
                </label>

                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={claimConsentGiven}
                    onChange={(e) => setClaimConsentGiven(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-coop-600 focus:ring-coop-500 h-4 w-4"
                  />
                  <span className="ml-2">
                    I consent to processing of the submitted claim information and documents for claim administration.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={submittingClaim || !claimAccuracyConfirmed || !claimConsentGiven}
                className={`w-full py-3 rounded-xl font-bold text-xs shadow-md transition ${
                  claimAccuracyConfirmed && claimConsentGiven
                    ? 'bg-coop-600 hover:bg-coop-700 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {submittingClaim ? 'Submitting...' : 'SUBMIT CLAIM'}
              </button>
            </form>
          )}

          {/* Claims List */}
          <div className="space-y-3">
            {claims.length > 0 ? (
              claims.map((clm) => (
                <div key={clm.claim_id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{clm.claim_type} Claim</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">Incident Date: {clm.incident_date}</div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] ${
                      clm.status === 'Approved' || clm.status === 'Settled'
                        ? 'bg-green-100 text-green-800'
                        : clm.status === 'Under Review'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {clm.status}
                    </span>
                  </div>
                  <p className="text-slate-700 mt-2">{clm.description}</p>
                  <div className="mt-3 flex justify-between items-center text-slate-500 border-t border-slate-200/60 pt-2 font-mono text-[11px]">
                    <span>Amount Claimed: <strong className="text-slate-900">₹{clm.amount_claimed}</strong></span>
                    <span>Claim ID: {clm.claim_id}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                No active claims filed.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Welfare & Official Schemes */}
      {activeTab === 'SCHEMES' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">WELFARE / SCHEMES CATALOG</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified Government & Cooperative Welfare Programs for Skilled Workers
            </p>
          </div>

          <div className="space-y-4">
            {schemes.map((sch) => (
              <div key={sch.scheme_id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{sch.name}</h3>
                    <p className="text-[11px] font-semibold text-coop-700">{sch.provider}</p>
                  </div>
                  <a
                    href={sch.official_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-coop-600 hover:bg-coop-700 text-white font-bold text-xs inline-flex items-center"
                  >
                    [ OFFICIAL ENROLLMENT ]
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                  <div><span className="font-bold text-slate-800">Eligibility:</span> {sch.eligibility}</div>
                  <div><span className="font-bold text-slate-800">Required Docs:</span> {sch.required_documents}</div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 font-medium">
                  {sch.benefits}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Terms & Conditions */}
      {activeTab === 'TERMS' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-4 text-xs text-slate-700 leading-relaxed">
          <h2 className="text-lg font-bold text-slate-900 mb-2">TASK UNITY INSURANCE TERMS & CONDITIONS</h2>
          <p>1. Task Unity is a cooperative-owned digital platform for verified skilled workers.</p>
          <p>2. Task Unity does NOT issue, generate, or underwrite insurance policies. All policies are held with authorized insurers or government social security portals.</p>
          <p>3. Voluntary deductions from job earnings are credited to the worker's insurance ledger and applied to official premium payments.</p>
          <p>4. Workers retain 100% control to enable or disable voluntary contribution at any time from their cooperative settings.</p>
        </div>
      )}
    </div>
  );
};
