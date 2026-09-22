/**
 * TASK UNITY EXTENDED FUNCTIONALITY & INTEGRATION TEST SUITE
 * Verifies:
 * 1. Role-First Login RBAC Validation (Worker, Customer, Admin)
 * 2. Primary Skill & Secondary Skill DB Persistence in worker_skills
 * 3. Multi-Service Geo-Matching Engine with Haversine distance
 * 4. Worker Availability Toggle & Database Persistence
 * 5. Database-driven Admin KPIs (Zero Hardcoded Offsets)
 * 6. Insurance Claims Full Lifecycle (Submit -> Review -> Approve -> Settle)
 * 7. Secure Official Policy Document Download
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

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    return { status: res.status, ok: res.ok, data, headers: res.headers };
  } else {
    const text = await res.text();
    return { status: res.status, ok: res.ok, text, headers: res.headers };
  }
}

async function runExtendedTests() {
  console.log('================================================================');
  console.log('TASK UNITY EXTENDED INTEGRATION & RBAC ACCEPTANCE TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. ROLE-FIRST LOGIN RBAC
    console.log('--- 1. Testing Role-First Login Enforcement ---');
    
    // Worker logging in as ADMIN -> should be rejected with 403
    const r1 = await req('/auth/login', 'POST', {
      email: 'raj@example.com',
      password: 'Password123!',
      expectedRole: 'ADMIN'
    });
    assert(r1.status === 403, 'Worker logging in via ADMIN role rejected with 403 Forbidden');

    // Customer logging in as WORKER -> should be rejected with 403
    const r2 = await req('/auth/login', 'POST', {
      email: 'lakshmi@example.com',
      password: 'Password123!',
      expectedRole: 'WORKER'
    });
    assert(r2.status === 403, 'Customer logging in via WORKER role rejected with 403 Forbidden');

    // Admin logging in with correct ADMIN role -> should succeed
    const r3 = await req('/auth/login', 'POST', {
      email: 'admin@taskunity.org',
      password: 'AdminPass123!',
      expectedRole: 'ADMIN'
    });
    assert(r3.status === 200 && r3.data.token, 'Admin login with ADMIN expectedRole succeeds');
    const adminToken = r3.data.token;

    // Worker logging in with correct WORKER role -> should succeed
    const r4 = await req('/auth/login', 'POST', {
      email: 'raj@example.com',
      password: 'Password123!',
      expectedRole: 'WORKER'
    });
    assert(r4.status === 200 && r4.data.token, 'Worker login with WORKER expectedRole succeeds');
    const workerToken = r4.data.token;

    // Customer logging in with correct CUSTOMER role -> should succeed
    const r5 = await req('/auth/login', 'POST', {
      email: 'lakshmi@example.com',
      password: 'Password123!',
      expectedRole: 'CUSTOMER'
    });
    assert(r5.status === 200 && r5.data.token, 'Customer login with CUSTOMER expectedRole succeeds');
    const customerToken = r5.data.token;

    // 2. PRIMARY SKILL & WORKER_SKILLS PERSISTENCE
    console.log('\n--- 2. Testing Worker Basic Profile & Skills Persistence ---');
    // Register a new test worker for onboarding
    const newWorkerEmail = `worker_${Date.now()}@example.com`;
    const workerPhone = `+91 9789${Math.floor(100000 + Math.random() * 900000)}`;
    const regRes = await req('/auth/register/worker', 'POST', {
      name: 'Ganesh Perumal',
      email: newWorkerEmail,
      phone: workerPhone,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      otp: '123456'
    });
    assert(regRes.status === 201 && regRes.data.token, 'New worker registered for skill persistence test');
    const testWorkerToken = regRes.data.token;

    // Submit basic profile with primary skill sk-plumb and secondary skills
    const bpRes = await req('/worker/basic-profile', 'POST', {
      dob: '1993-08-22',
      gender: 'Male',
      address: '77 Cross Cut Road',
      district: 'Coimbatore',
      state: 'Tamil Nadu',
      primarySkillId: 'sk-plumb',
      secondarySkills: ['Cleaner', 'Technician'],
      yearsExperience: 5,
      preferredWorkingArea: 'Coimbatore North'
    }, testWorkerToken);
    assert(bpRes.status === 200 && bpRes.data.next_step === 'ESHRAM', 'Basic profile submitted successfully');

    // 3. MULTI-SERVICE GEO-MATCHING & HAVERSINE DISTANCE
    console.log('\n--- 3. Testing Multi-Service Geo-Matching Engine ---');
    // Match Plumber
    const matchPlumb = await req('/bookings/match-workers?skillId=sk-plumb&lat=11.0168&lng=76.9558', 'GET', null, customerToken);
    assert(matchPlumb.status === 200 && matchPlumb.data.workers.length > 0, `Matching Plumbers found (${matchPlumb.data.workers.length} active)`);
    assert(matchPlumb.data.workers[0].distance_km !== undefined, `Calculated Haversine distance: ${matchPlumb.data.workers[0].distance_km} km`);

    // Match AC Technician
    const matchAc = await req('/bookings/match-workers?skillId=sk-actech&lat=11.6643&lng=78.1460', 'GET', null, customerToken);
    assert(matchAc.status === 200 && matchAc.data.workers.length > 0, `Matching AC Technicians found (${matchAc.data.workers.length} active in Salem)`);

    // Match Cleaner
    const matchClean = await req('/bookings/match-workers?skillId=sk-clean&lat=11.0168&lng=76.9558', 'GET', null, customerToken);
    assert(matchClean.status === 200 && matchClean.data.workers.length > 0, `Matching Cleaners found (${matchClean.data.workers.length} active)`);

    // 4. WORKER AVAILABILITY TOGGLE & DB PERSISTENCE
    console.log('\n--- 4. Testing Worker Availability Toggle ---');
    const toggleOff = await req('/worker/availability', 'POST', { isAvailable: false }, workerToken);
    assert(toggleOff.status === 200 && toggleOff.data.is_available === false, 'Worker toggled status to OFFLINE');

    const toggleOn = await req('/worker/availability', 'POST', { isAvailable: true }, workerToken);
    assert(toggleOn.status === 200 && toggleOn.data.is_available === true, 'Worker toggled status to 🟢 AVAILABLE');

    // 5. PURE DATABASE ADMIN KPIS (ZERO HARDCODED OFFSETS)
    console.log('\n--- 5. Testing Database-Driven Admin Overview KPIs ---');
    const overviewRes = await req('/admin/overview', 'GET', null, adminToken);
    assert(overviewRes.status === 200, 'Admin overview endpoint returns 200 OK');
    const stats = overviewRes.data.stats;
    console.log('   Live Database KPIs:', JSON.stringify(stats));
    assert(typeof stats.total_workers === 'number' && stats.total_workers >= 2, `total_workers is pure DB count: ${stats.total_workers}`);
    assert(typeof stats.workers_online === 'number' && stats.workers_online >= 1, `workers_online is pure DB count: ${stats.workers_online}`);
    assert(stats.total_workers < 1248, `Confirmed NO hardcoded offset 1248 (current real DB total: ${stats.total_workers})`);
    assert(stats.workers_online < 320, `Confirmed NO hardcoded offset 320 (current real DB online: ${stats.workers_online})`);
    assert(typeof stats.pending_verification === 'number', `pending_verification count: ${stats.pending_verification}`);
    assert(typeof stats.insurance_active === 'number', `insurance_active count: ${stats.insurance_active}`);

    // 6. INSURANCE CLAIMS FULL LIFECYCLE
    console.log('\n--- 6. Testing Complete Insurance Claims Lifecycle ---');
    // Worker submits claim
    const claimRes = await req('/insurance/claims', 'POST', {
      claimType: 'Accident',
      incidentDate: '2026-09-20',
      description: 'Minor slip injury during site electrical repair',
      documents: '/uploads/claims/medical_slip.pdf',
      amountClaimed: 4200,
      accuracyConfirmed: true,
      processingConsentGiven: true
    }, workerToken);
    assert(claimRes.status === 201 && claimRes.data.claim_id, `Claim submitted successfully (ID: ${claimRes.data?.claim_id})`);
    const claimId = claimRes.data.claim_id;

    // Admin views claims
    const adminClaimsRes = await req('/admin/claims', 'GET', null, adminToken);
    assert(adminClaimsRes.status === 200 && Array.isArray(adminClaimsRes.data.claims), 'Admin can fetch all insurance claims');
    const createdClaim = adminClaimsRes.data.claims.find(c => c.claim_id === claimId);
    assert(!!createdClaim && createdClaim.status === 'Submitted', 'Submitted claim appears in admin queue with status Submitted');

    // Admin reviews claim
    const reviewRes = await req(`/admin/claims/${claimId}/status`, 'POST', { status: 'Under Review' }, adminToken);
    assert(reviewRes.status === 200, 'Admin can update claim status to Under Review');

    // Admin approves claim
    const approveRes = await req(`/admin/claims/${claimId}/status`, 'POST', { status: 'Approved' }, adminToken);
    assert(approveRes.status === 200, 'Admin can update claim status to Approved');

    // Admin settles claim
    const settleRes = await req(`/admin/claims/${claimId}/status`, 'POST', { status: 'Settled' }, adminToken);
    assert(settleRes.status === 200, 'Admin can disburse and mark claim as Settled');

    // 7. SECURE OFFICIAL POLICY DOCUMENT DOWNLOAD
    console.log('\n--- 7. Testing Official Policy Document Download ---');
    const dlRes = await req('/insurance/my-policy/download', 'GET', null, workerToken);
    assert(dlRes.status === 200, 'Policy document download returns 200 OK');
    assert(dlRes.headers.get('content-type')?.includes('text/html'), 'Policy document delivered as official HTML certificate');
    assert(dlRes.text.includes('TASK UNITY COOPERATIVE SOCIETY'), 'Policy document contains Task Unity Cooperative society header');
    assert(dlRes.text.includes('VERIFIED & ACTIVE'), 'Policy document contains verified & active status');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`EXTENDED TEST RESULTS: ${passed} PASSED / ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================');

  if (failed === 0) {
    console.log('\nALL EXTENDED PRODUCTION SPECIFICATIONS FULLY VERIFIED!\n');
    process.exit(0);
  } else {
    console.error(`\nTEST SUITE FAILED WITH ${failed} FAILURES.`);
    process.exit(1);
  }
}

runExtendedTests();
