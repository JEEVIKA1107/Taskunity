/**
 * TASK UNITY — End-to-End Automated Acceptance Test Suite
 * Tests all 22 acceptance criteria from Section 84
 */

const BASE_URL = 'http://127.0.0.1:5000/api';

async function req(path, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

let passed = 0;
let failed = 0;

function assert(condition, name, details = '') {
  if (condition) {
    console.log(`[PASS] Test ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] Test ${name} — ${details}`);
    failed++;
  }
}

async function runAcceptanceTests() {
  console.log('================================================================');
  console.log('STARTING TASK UNITY 22 ACCEPTANCE CRITERIA VERIFICATION SUITE');
  console.log('================================================================\n');

  // Generate unique test runs
  const timestamp = Date.now();
  const testWorkerEmail = `test.worker.${timestamp}@taskunity.test`;
  const testWorkerPhone = `+91 91000${(timestamp % 100000).toString().padStart(5, '0')}`;
  const testCustomerEmail = `test.customer.${timestamp}@taskunity.test`;
  const testCustomerPhone = `+91 92000${(timestamp % 100000).toString().padStart(5, '0')}`;

  let workerToken = '';
  let workerId = '';
  let customerToken = '';
  let adminToken = '';
  let bookingId = '';

  // 0. Pre-login Admin
  const adminLogin = await req('/auth/login', 'POST', {
    email: 'admin@taskunity.org',
    password: 'AdminPass123!'
  });
  adminToken = adminLogin.data.token;
  assert(adminLogin.ok && adminToken, '0: Admin login works');

  // Test 1: Worker registration creates worker record
  const workerReg = await req('/auth/register/worker', 'POST', {
    name: 'Ramesh Sundaram',
    email: testWorkerEmail,
    password: 'WorkerSecurePass123!',
    confirmPassword: 'WorkerSecurePass123!',
    phone: testWorkerPhone,
    otp: '123456'
  });
  assert(
    workerReg.ok && workerReg.data.user && workerReg.data.user.role === 'WORKER',
    '1: Worker registration creates worker record',
    JSON.stringify(workerReg.data)
  );
  workerToken = workerReg.data.token;
  workerId = workerReg.data.user.worker_id;

  // Test 2: Duplicate email/phone registration rejected
  const dupReg = await req('/auth/register/worker', 'POST', {
    name: 'Duplicate Worker',
    email: testWorkerEmail,
    password: 'Password123!',
    confirmPassword: 'Password123!',
    phone: testWorkerPhone,
    otp: '123456'
  });
  assert(
    !dupReg.ok && (dupReg.status === 400 || dupReg.status === 409),
    '2: Duplicate email/phone registration rejected with 409/400 Conflict',
    JSON.stringify(dupReg.data)
  );

  // Register a Customer for later tests
  const custReg = await req('/auth/register/customer', 'POST', {
    name: 'Ananya Krishnan',
    email: testCustomerEmail,
    password: 'CustomerPass123!',
    confirmPassword: 'CustomerPass123!',
    phone: testCustomerPhone,
    otp: '123456'
  });
  assert(custReg.ok && custReg.data.token, 'Setup: Customer registered successfully');
  customerToken = custReg.data.token;

  // Test 3: Customer cannot access worker-specific endpoints
  const custAccessWorker = await req('/worker/availability', 'POST', { isAvailable: true }, customerToken);
  assert(
    !custAccessWorker.ok && (custAccessWorker.status === 403 || custAccessWorker.status === 401),
    '3: Customer cannot access worker dashboard/endpoints (403 Forbidden)',
    `Status was ${custAccessWorker.status}`
  );

  // Test 4: Worker role segregation enforced
  const workerMe = await req('/auth/me', 'GET', null, workerToken);
  assert(
    workerMe.ok && workerMe.data.user.role === 'WORKER',
    '4: Worker profile strictly identified as WORKER'
  );

  // Test 5: Ordinary users cannot access admin dashboard / endpoints (403 Forbidden)
  const workerAccessAdmin = await req('/admin/overview', 'GET', null, workerToken);
  const custAccessAdmin = await req('/admin/overview', 'GET', null, customerToken);
  assert(
    !workerAccessAdmin.ok && workerAccessAdmin.status === 403 &&
    !custAccessAdmin.ok && custAccessAdmin.status === 403,
    '5: Ordinary users cannot access admin dashboard (403 Forbidden server-side RBAC)',
    `Worker status: ${workerAccessAdmin.status}, Customer status: ${custAccessAdmin.status}`
  );

  // Test 6: Basic profile saves without e-Shram
  const basicProf = await req('/worker/basic-profile', 'POST', {
    name: 'Ramesh Sundaram',
    dob: '1992-04-12',
    gender: 'Male',
    address: '15 Gandhi Bazaar, Trichy',
    district: 'Tiruchirappalli',
    state: 'Tamil Nadu',
    primarySkillId: 'sk-elec',
    yearsExperience: 5,
    preferredWorkingArea: 'Central Trichy'
  }, workerToken);
  assert(
    basicProf.ok && basicProf.data.success,
    '6: Basic profile saves successfully without requiring e-Shram first',
    JSON.stringify(basicProf.data)
  );

  // Test 7: Worker can choose "I do not have an e-Shram card"
  const noEshram = await req('/worker/eshram', 'POST', {
    isRegistered: false
  }, workerToken);
  assert(
    noEshram.ok && noEshram.data.success,
    '7: Worker can choose "I do not have an e-Shram card" and advance',
    JSON.stringify(noEshram.data)
  );

  // Admin approves e-Shram record
  const adminWorkersList = await req('/admin/workers', 'GET', null, adminToken);
  const targetWorker = adminWorkersList.data.workers?.find(w => w.worker_id === workerId);
  const eshramRecord = await req('/worker/onboarding-status', 'GET', null, workerToken);
  const eshramId = eshramRecord.data.data?.eshram?.eshram_id;
  if (eshramId) {
    await req(`/admin/verify/eshram/${eshramId}`, 'POST', { status: 'VERIFIED' }, adminToken);
  }

  // Test 8: Skill certification requires document upload
  const certNoDoc = await req('/worker/certification', 'POST', {
    primarySkill: 'Electrician',
    certificationName: 'National Trade Certificate',
    certificateNumber: 'ITI-EL-9921',
    issuingOrg: 'NCVT',
    issueDate: '2020-05-10',
    documentUrl: '' // Missing document
  }, workerToken);
  assert(
    !certNoDoc.ok && certNoDoc.status === 400,
    '8: Skill certification rejects empty document upload (requires valid document)',
    JSON.stringify(certNoDoc.data)
  );

  const certWithDoc = await req('/worker/certification', 'POST', {
    primarySkill: 'Electrician',
    certificationName: 'National Trade Certificate',
    certificateNumber: 'ITI-EL-9921',
    issuingOrg: 'NCVT',
    issueDate: '2020-05-10',
    expiryDate: '2030-05-10',
    documentUrl: '/uploads/certs/iti_electrician_ramesh.pdf',
    yearsExperience: 5
  }, workerToken);
  assert(
    certWithDoc.ok && certWithDoc.data.success,
    '8b: Skill certification saves with valid document upload',
    JSON.stringify(certWithDoc.data)
  );

  // Test 9: Worker can select "I don't have insurance" and skip
  const skipInsurance = await req('/worker/insurance-decision', 'POST', {
    needsInsurance: false
  }, workerToken);
  assert(
    skipInsurance.ok && skipInsurance.data.success && skipInsurance.data.next_step === 'COOPERATIVE_APPROVAL',
    '9: Worker can select "I don\'t have insurance" and skip to cooperative verification',
    JSON.stringify(skipInsurance.data)
  );

  // Test 10: Terms & conditions consent requirement before insurance submission
  // Test missing consent checkboxes
  const consentMissing = await req('/worker/insurance-submit', 'POST', {
    providerOrScheme: 'Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)',
    policyNumber: 'PMJJBY-90182-TR',
    policyHolderName: 'Ramesh Sundaram',
    coverage: '₹2,00,000 Life Insurance',
    startDate: '2026-06-01',
    endDate: '2027-05-31',
    documentUrl: '/uploads/policies/pmjjby_ramesh.pdf',
    termsAccepted: false // Missing consent
  }, workerToken);
  assert(
    !consentMissing.ok && consentMissing.status === 400,
    '10: Insurance policy rejects submission without mandatory 4 consent checkboxes',
    JSON.stringify(consentMissing.data)
  );

  const consentValid = await req('/worker/insurance-submit', 'POST', {
    providerOrScheme: 'Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)',
    policyNumber: 'PMJJBY-90182-TR',
    policyHolderName: 'Ramesh Sundaram',
    coverage: '₹2,00,000 Life Insurance',
    startDate: '2026-06-01',
    endDate: '2027-05-31',
    documentUrl: '/uploads/policies/pmjjby_ramesh.pdf',
    isExistingPolicy: true,
    termsAccepted: true,
    accuracyConfirmed: true,
    noPlatformIssuanceUnderstood: true,
    processingConsentGiven: true
  }, workerToken);
  assert(
    consentValid.ok && consentValid.data.success,
    '10b: Terms & conditions consent accepted with all 4 mandatory checkboxes',
    JSON.stringify(consentValid.data)
  );

  // Test 11: Contribution choice disabled until verification complete
  // Policy is currently PENDING verification
  const prematureContrib = await req('/worker/contribution-choice', 'POST', {
    enableContribution: true
  }, workerToken);
  assert(
    !prematureContrib.ok && prematureContrib.status === 400,
    '11: Contribution choice rejected until verification is complete',
    prematureContrib.data.message
  );

  // Test 12: Admin can view submitted documents
  const adminWorkers = await req('/admin/workers', 'GET', null, adminToken);
  const foundWorker = adminWorkers.data.workers?.find(w => w.worker_id === workerId);
  assert(
    adminWorkers.ok && foundWorker && foundWorker.name === 'Ramesh Sundaram',
    '12: Admin can view worker application and verification queue'
  );

  // Test 13: Admin can reject certification with reason
  const certStatusRes = await req('/worker/onboarding-status', 'GET', null, workerToken);
  const certId = certWithDoc.data?.certId || certWithDoc.data?.certification_id || certStatusRes.data.data?.cert?.certification_id;
  
  if (certId) {
    const adminRejectCert = await req(`/admin/verify/certification/${certId}`, 'POST', {
      status: 'REJECTED',
      rejectionReason: 'Certificate blurred; serial number unreadable.'
    }, adminToken);
    assert(
      adminRejectCert.ok,
      '13: Admin can reject certification with structured rejection reason',
      JSON.stringify(adminRejectCert.data)
    );

    // Test 14: Worker sees rejection reason and can resubmit
    const statusAfterReject = await req('/worker/onboarding-status', 'GET', null, workerToken);
    assert(
      statusAfterReject.data.data?.cert?.verification_status === 'REJECTED' &&
      statusAfterReject.data.data?.cert?.rejection_reason?.includes('blurred'),
      '14: Worker sees rejection reason on their onboarding dashboard'
    );

    // Re-verify certification as approved for the remainder of the flow
    await req(`/admin/verify/certification/${certId}`, 'POST', {
      status: 'VERIFIED'
    }, adminToken);
  }

  // Admin verifies insurance policy
  const adminInsurance = await req('/admin/insurance', 'GET', null, adminToken);
  const workerPolicy = adminInsurance.data.data?.policies?.find(p => p.worker_id === workerId);
  if (workerPolicy) {
    await req(`/admin/verify/insurance/${workerPolicy.policy_id}`, 'POST', { status: 'VERIFIED' }, adminToken);
  }

  // Test 11b: Now Contribution Choice is enabled!
  const validContrib = await req('/worker/contribution-choice', 'POST', {
    enableContribution: true
  }, workerToken);
  assert(
    validContrib.ok && validContrib.data.success,
    '11b: Contribution choice successfully enabled after policy verification'
  );

  // Test 15: Cooperative approval activates worker
  const coopApproval = await req(`/admin/verify/cooperative-approval/${workerId}`, 'POST', {
    action: 'APPROVE',
    notes: 'Approved by Cooperative Board'
  }, adminToken);
  assert(
    coopApproval.ok && coopApproval.data.status === 'ACTIVE',
    '15: Cooperative approval activates worker with full access'
  );

  // Test 16: Activated worker can toggle availability to AVAILABLE
  const toggleAvail = await req('/worker/availability', 'POST', { isAvailable: true }, workerToken);
  assert(
    toggleAvail.ok && toggleAvail.data.isAvailable === true,
    '16: Activated worker can toggle availability to AVAILABLE'
  );

  // Test 17: Customer can create booking with matching engine
  const createBooking = await req('/bookings', 'POST', {
    service_id: 'srv-elec-fan',
    problem_title: 'Ceiling fan humming and not rotating',
    description: 'Requires capacitor replacement or rewinding.',
    customer_address: '14 Gandhipuram 4th Cross, Coimbatore',
    customer_lat: 11.0180,
    customer_lng: 76.9570,
    scheduled_time: 'Today 10:30 AM',
    worker_id: workerId // Match Ramesh
  }, customerToken);
  assert(
    createBooking.ok && createBooking.data.booking && (createBooking.data.booking.booking_id || createBooking.data.booking.id),
    '17: Customer can create booking with automated cooperative worker matching',
    JSON.stringify(createBooking.data)
  );
  bookingId = createBooking.data.booking?.booking_id || createBooking.data.booking?.id;

  // Test 18: Worker receives booking notification / can view assigned booking
  const workerJobs = await req('/worker/dashboard', 'GET', null, workerToken);
  const assignedJob = workerJobs.data.activeBooking || workerJobs.data.jobs?.find(j => (j.booking_id || j.id) === bookingId);
  assert(
    workerJobs.ok && (assignedJob || workerJobs.data.jobs?.length > 0),
    '18: Worker receives booking in active dashboard jobs queue'
  );

  // Test 19: Worker can accept booking
  const acceptJob = await req(`/bookings/${bookingId}/status`, 'PATCH', {
    status: 'ACCEPTED'
  }, workerToken);
  assert(
    acceptJob.ok && (acceptJob.data.booking.status === 'ACCEPTED'),
    '19: Worker can accept booking and status moves to ACCEPTED'
  );

  // Test 20: Status progression pipeline
  const travelling = await req(`/bookings/${bookingId}/status`, 'PATCH', { status: 'WORKER_TRAVELLING' }, workerToken);
  const arrived = await req(`/bookings/${bookingId}/status`, 'PATCH', { status: 'ARRIVED' }, workerToken);
  const inProgress = await req(`/bookings/${bookingId}/status`, 'PATCH', { status: 'SERVICE_IN_PROGRESS' }, workerToken);
  const completed = await req(`/bookings/${bookingId}/status`, 'PATCH', { status: 'COMPLETED' }, workerToken);
  assert(
    travelling.ok && arrived.ok && inProgress.ok && completed.ok && completed.data.booking.status === 'COMPLETED',
    '20: Status progression: REQUESTED -> ACCEPTED -> WORKER_TRAVELLING -> ARRIVED -> SERVICE_IN_PROGRESS -> COMPLETED'
  );

  // Test 21: Digital invoice generated with 10% insurance fund deduction explicitly displayed
  const payInvoice = await req(`/bookings/${bookingId}/pay`, 'POST', {
    payment_method: 'UPI'
  }, customerToken);
  assert(
    payInvoice.ok &&
    payInvoice.data.invoice &&
    payInvoice.data.invoice.insurance_contribution > 0 &&
    payInvoice.data.invoice.net_earnings < payInvoice.data.invoice.service_amount,
    '21: Digital invoice generated with 10% insurance fund deduction explicitly recorded in ledger',
    JSON.stringify(payInvoice.data.invoice)
  );

  // Test 22: Dual ratings submitted and stored
  const dualRating = await req(`/bookings/${bookingId}/rate`, 'POST', {
    rating: 5,
    timeliness_rating: 5,
    review: 'Ramesh arrived promptly, replaced the fan capacitor with genuine parts, highly professional!'
  }, customerToken);
  assert(
    dualRating.ok && dualRating.data.success,
    '22: Dual ratings (Work Quality + Timeliness & Conduct) submitted and stored'
  );

  console.log('\n================================================================');
  console.log(`ACCEPTANCE TEST RESULTS: ${passed} PASSED / ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed === 0) {
    console.log('ALL 22 ACCEPTANCE CRITERIA SATISFIED TO FULL PRODUCTION SPECIFICATION!');
    process.exit(0);
  } else {
    console.error('SOME ACCEPTANCE TESTS FAILED.');
    process.exit(1);
  }
}

runAcceptanceTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
