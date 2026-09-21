import { getDb, execScript, getOne, runQuery, saveDb } from './database';
import bcrypt from 'bcryptjs';

export async function initDatabase(): Promise<void> {
  const schemaSql = `
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK(role IN ('WORKER', 'CUSTOMER', 'ADMIN')),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      language TEXT DEFAULT 'en',
      account_status TEXT DEFAULT 'ACTIVE' CHECK(account_status IN ('ACTIVE', 'SUSPENDED', 'PENDING')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS workers (
      worker_id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      onboarding_status TEXT NOT NULL,
      dob TEXT,
      gender TEXT,
      address TEXT,
      district TEXT,
      state TEXT,
      profile_photo TEXT,
      primary_skill_id TEXT,
      secondary_skills TEXT,
      years_experience INTEGER DEFAULT 0,
      preferred_working_area TEXT,
      rating REAL DEFAULT 5.0,
      jobs_completed INTEGER DEFAULT 0,
      insurance_contribution_enabled INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS customers (
      customer_id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      address TEXT,
      district TEXT,
      state TEXT,
      preferred_language TEXT DEFAULT 'en',
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cooperatives (
      cooperative_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      registration_number TEXT NOT NULL,
      district TEXT NOT NULL,
      state TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS skills (
      skill_id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      icon TEXT NOT NULL,
      description TEXT,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS worker_skills (
      id TEXT PRIMARY KEY,
      worker_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      years_experience INTEGER DEFAULT 0,
      FOREIGN KEY(worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE,
      FOREIGN KEY(skill_id) REFERENCES skills(skill_id)
    );

    CREATE TABLE IF NOT EXISTS certifications (
      certification_id TEXT PRIMARY KEY,
      worker_id TEXT NOT NULL,
      primary_skill TEXT NOT NULL,
      certification_name TEXT NOT NULL,
      certificate_number TEXT NOT NULL,
      issuing_org TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      expiry_date TEXT,
      document_url TEXT NOT NULL,
      verification_status TEXT DEFAULT 'PENDING' CHECK(verification_status IN ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED')),
      rejection_reason TEXT,
      verified_by TEXT,
      verified_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS worker_documents (
      document_id TEXT PRIMARY KEY,
      worker_id TEXT NOT NULL,
      document_type TEXT NOT NULL,
      document_url TEXT NOT NULL,
      verification_status TEXT DEFAULT 'PENDING',
      uploaded_at TEXT NOT NULL,
      FOREIGN KEY(worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS eshram_records (
      eshram_id TEXT PRIMARY KEY,
      worker_id TEXT UNIQUE NOT NULL,
      is_registered INTEGER NOT NULL,
      eshram_number TEXT,
      holder_name TEXT,
      document_url TEXT,
      verification_status TEXT DEFAULT 'PENDING' CHECK(verification_status IN ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED')),
      rejection_reason TEXT,
      verified_by TEXT,
      verified_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS insurance_policies (
      policy_id TEXT PRIMARY KEY,
      worker_id TEXT UNIQUE NOT NULL,
      provider_or_scheme TEXT NOT NULL,
      policy_number TEXT NOT NULL,
      policy_holder_name TEXT NOT NULL,
      coverage TEXT NOT NULL,
      start_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      document_url TEXT NOT NULL,
      verification_status TEXT DEFAULT 'PENDING' CHECK(verification_status IN ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED')),
      rejection_reason TEXT,
      verified_by TEXT,
      verified_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS insurance_schemes (
      scheme_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      description TEXT NOT NULL,
      eligibility TEXT NOT NULL,
      benefits TEXT NOT NULL,
      required_documents TEXT NOT NULL,
      official_url TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      last_verified_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS insurance_contributions (
      contribution_id TEXT PRIMARY KEY,
      worker_id TEXT NOT NULL,
      booking_id TEXT,
      payment_id TEXT,
      payment_amount REAL NOT NULL,
      contribution_rate REAL NOT NULL,
      contribution_amount REAL NOT NULL,
      status TEXT DEFAULT 'RECORDED',
      transaction_reference TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(worker_id) REFERENCES workers(worker_id)
    );

    CREATE TABLE IF NOT EXISTS insurance_fund_ledger (
      ledger_id TEXT PRIMARY KEY,
      contribution_id TEXT,
      worker_id TEXT NOT NULL,
      booking_id TEXT,
      credit_amount REAL DEFAULT 0,
      debit_amount REAL DEFAULT 0,
      balance_after REAL NOT NULL,
      transaction_type TEXT NOT NULL,
      reference TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS insurance_claims (
      claim_id TEXT PRIMARY KEY,
      worker_id TEXT NOT NULL,
      policy_id TEXT,
      claim_type TEXT NOT NULL,
      incident_date TEXT NOT NULL,
      description TEXT NOT NULL,
      documents TEXT,
      amount_claimed REAL NOT NULL,
      status TEXT DEFAULT 'Submitted' CHECK(status IN ('Submitted', 'Under Review', 'Documents Required', 'Approved', 'Rejected', 'Settled', 'Closed')),
      admin_notes TEXT,
      submitted_at TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY(worker_id) REFERENCES workers(worker_id)
    );

    CREATE TABLE IF NOT EXISTS worker_locations (
      location_id TEXT PRIMARY KEY,
      worker_id TEXT NOT NULL,
      booking_id TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      heading REAL DEFAULT 0,
      speed REAL DEFAULT 0,
      location_state TEXT DEFAULT 'AVAILABLE' CHECK(location_state IN ('OFFLINE', 'AVAILABLE', 'JOB_ASSIGNED', 'TRAVELLING_TO_CUSTOMER', 'ARRIVED', 'SERVICE_IN_PROGRESS', 'COMPLETED')),
      updated_at TEXT NOT NULL,
      FOREIGN KEY(worker_id) REFERENCES workers(worker_id)
    );

    CREATE TABLE IF NOT EXISTS worker_availability (
      availability_id TEXT PRIMARY KEY,
      worker_id TEXT UNIQUE NOT NULL,
      is_available INTEGER DEFAULT 1,
      location_sharing_enabled INTEGER DEFAULT 1,
      last_status_change TEXT NOT NULL,
      FOREIGN KEY(worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS services (
      service_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      base_price REAL NOT NULL,
      description TEXT,
      icon TEXT,
      FOREIGN KEY(skill_id) REFERENCES skills(skill_id)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      booking_id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      worker_id TEXT,
      service_id TEXT NOT NULL,
      problem_title TEXT NOT NULL,
      description TEXT NOT NULL,
      photos TEXT,
      customer_address TEXT NOT NULL,
      customer_lat REAL NOT NULL,
      customer_lng REAL NOT NULL,
      scheduled_time TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('REQUESTED', 'ACCEPTED', 'WORKER_TRAVELLING', 'ARRIVED', 'SERVICE_IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
      total_amount REAL NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(customer_id) REFERENCES customers(customer_id),
      FOREIGN KEY(worker_id) REFERENCES workers(worker_id),
      FOREIGN KEY(service_id) REFERENCES services(service_id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      payment_id TEXT PRIMARY KEY,
      booking_id TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL,
      worker_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT DEFAULT 'COMPLETED',
      transaction_reference TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(booking_id) REFERENCES bookings(booking_id),
      FOREIGN KEY(customer_id) REFERENCES customers(customer_id),
      FOREIGN KEY(worker_id) REFERENCES workers(worker_id)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      invoice_id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      booking_id TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL,
      worker_id TEXT NOT NULL,
      service_amount REAL NOT NULL,
      insurance_contribution REAL NOT NULL,
      net_earnings REAL NOT NULL,
      status TEXT DEFAULT 'PAID',
      created_at TEXT NOT NULL,
      FOREIGN KEY(booking_id) REFERENCES bookings(booking_id),
      FOREIGN KEY(customer_id) REFERENCES customers(customer_id),
      FOREIGN KEY(worker_id) REFERENCES workers(worker_id)
    );

    CREATE TABLE IF NOT EXISTS ratings (
      rating_id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      from_user_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      rating_value INTEGER NOT NULL CHECK(rating_value >= 1 AND rating_value <= 5),
      comment TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(booking_id) REFERENCES bookings(booking_id),
      FOREIGN KEY(from_user_id) REFERENCES users(user_id),
      FOREIGN KEY(to_user_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS feedback (
      feedback_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_role TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'Under Review',
      admin_notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS complaints (
      complaint_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_role TEXT NOT NULL,
      booking_id TEXT,
      category TEXT NOT NULL,
      priority TEXT NOT NULL CHECK(priority IN ('Normal', 'Urgent', 'Emergency')),
      description TEXT NOT NULL,
      status TEXT DEFAULT 'Submitted' CHECK(status IN ('Submitted', 'Assigned', 'Under Review', 'Waiting for Information', 'Resolved', 'Closed')),
      admin_notes TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      notification_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      link TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS demand_forecast (
      forecast_id TEXT PRIMARY KEY,
      district TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      forecast_period TEXT NOT NULL,
      demand_level TEXT NOT NULL,
      confidence_score REAL NOT NULL,
      historical_trend TEXT NOT NULL,
      factors_json TEXT NOT NULL,
      generated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS worker_allocation (
      allocation_id TEXT PRIMARY KEY,
      district TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      current_workers INTEGER NOT NULL,
      expected_demand INTEGER NOT NULL,
      deficit INTEGER NOT NULL,
      suggested_action TEXT NOT NULL,
      status TEXT DEFAULT 'RECOMMENDED',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cooperative_settings (
      setting_id TEXT PRIMARY KEY,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT NOT NULL,
      description TEXT,
      updated_by TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      log_id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details_json TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS consents (
      consent_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      consent_type TEXT NOT NULL,
      consent_version TEXT NOT NULL,
      accepted INTEGER NOT NULL,
      accepted_at TEXT NOT NULL,
      ip_address_or_audit_reference TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(user_id)
    );
  `;

  await execScript(schemaSql);
  await seedInitialData();
}

async function seedInitialData(): Promise<void> {
  const existingAdmin = await getOne(`SELECT user_id FROM users WHERE email = 'admin@taskunity.org'`);
  if (existingAdmin) {
    // Already seeded
    return;
  }

  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const adminHash = await bcrypt.hash('AdminPass123!', 10);

  // 1. Cooperative record
  await runQuery(`
    INSERT INTO cooperatives (cooperative_id, name, registration_number, district, state, contact_email, created_at)
    VALUES ('coop-001', 'Tamil Nadu Skilled Workers Cooperative Society', 'TN-COOP-2024-8921', 'Coimbatore', 'Tamil Nadu', 'support@taskunity.org', ?)
  `, [now]);

  // 2. Settings
  await runQuery(`
    INSERT INTO cooperative_settings (setting_id, setting_key, setting_value, description, updated_by, updated_at)
    VALUES 
      ('s1', 'insurance_contribution_rate', '10', 'Default percentage contribution deducted from completed jobs for verified active insurance', 'admin', ?),
      ('s2', 'cooperative_name', 'Task Unity Cooperative Society', 'Platform Cooperative Operating Authority', 'admin', ?),
      ('s3', 'accounting_label_service', 'Service Amount', 'Configurable invoice line item label for service fee', 'admin', ?),
      ('s4', 'accounting_label_contribution', 'Insurance Contribution', 'Configurable invoice line item label for insurance fund deduction', 'admin', ?)
  `, [now, now, now, now]);

  // 3. Skills
  const skillsList = [
    { id: 'sk-elec', name: 'Electrician', category: 'Electrical', icon: 'Zap' },
    { id: 'sk-plumb', name: 'Plumber', category: 'Plumbing', icon: 'Wrench' },
    { id: 'sk-paint', name: 'Painter', category: 'Finishing', icon: 'Paintbrush' },
    { id: 'sk-carp', name: 'Carpenter', category: 'Woodwork', icon: 'Hammer' },
    { id: 'sk-clean', name: 'Cleaner', category: 'Sanitation', icon: 'Sparkles' },
    { id: 'sk-gard', name: 'Gardener', category: 'Landscaping', icon: 'Flower' },
    { id: 'sk-driv', name: 'Driver', category: 'Transportation', icon: 'Car' },
    { id: 'sk-care', name: 'Caregiver', category: 'Healthcare', icon: 'HeartHandshake' },
    { id: 'sk-tech', name: 'Technician', category: 'Appliance Repair', icon: 'Cpu' },
    { id: 'sk-oth', name: 'Other Skilled Worker', category: 'General', icon: 'Briefcase' }
  ];

  for (const s of skillsList) {
    await runQuery(`
      INSERT INTO skills (skill_id, name, category, icon, description, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `, [s.id, s.name, s.category, s.icon, `Certified professional ${s.name} services under Task Unity cooperative`]);
  }

  // 4. Services
  const servicesList = [
    { id: 'srv-1', skill_id: 'sk-elec', name: 'Ceiling Fan Repair & Installation', price: 450, desc: 'Complete wiring, motor, and blade balancing' },
    { id: 'srv-2', skill_id: 'sk-elec', name: 'Switchboard & Circuit Repair', price: 350, desc: 'MCB testing, switch replacement, short circuit fix' },
    { id: 'srv-3', skill_id: 'sk-elec', name: 'Full House Electrical Inspection', price: 1000, desc: 'Safety audit, grounding verification, wiring load check' },
    { id: 'srv-4', skill_id: 'sk-plumb', name: 'Pipe Leakage & Tap Repair', price: 400, desc: 'Quick leak sealing, tap replacement, pipe joining' },
    { id: 'srv-5', skill_id: 'sk-plumb', name: 'Water Motor & Tank Installation', price: 1200, desc: 'Submersible pump wiring and pipe connection' },
    { id: 'srv-6', skill_id: 'sk-paint', name: 'Interior Wall Painting', price: 2500, desc: 'Primer, putty, and double coat emulsion' },
    { id: 'srv-7', skill_id: 'sk-carp', name: 'Door & Lock Fitting', price: 600, desc: 'Mortise lock installation and alignment' },
    { id: 'srv-8', skill_id: 'sk-clean', name: 'Deep Home Sanitization', price: 1500, desc: 'High-pressure bathroom and kitchen cleaning' }
  ];

  for (const srv of servicesList) {
    await runQuery(`
      INSERT INTO services (service_id, name, skill_id, base_price, description, icon)
      VALUES (?, ?, ?, ?, ?, 'Tool')
    `, [srv.id, srv.name, srv.skill_id, srv.price, srv.desc]);
  }

  // 5. Official Insurance & Welfare Schemes (NO INVENTED SCHEMES - Authentic Government Social Security Schemes)
  const schemesList = [
    {
      id: 'sch-pmjjby',
      name: 'Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)',
      provider: 'Government of India / LIC & Participating Life Insurers',
      desc: 'Life insurance cover of ₹2 Lakh for death due to any reason for unorganised and skilled workers.',
      eligibility: 'Citizens aged 18 to 50 years having a bank account and Aadhaar.',
      benefits: '₹2,00,000 payable upon member death due to any cause. Annual premium of ₹436 auto-debited via bank.',
      docs: 'Aadhaar Card, Bank Passbook, e-Shram Card / Nominee Form',
      url: 'https://jansuraksha.gov.in'
    },
    {
      id: 'sch-pmsby',
      name: 'Pradhan Mantri Suraksha Bima Yojana (PMSBY)',
      provider: 'Government of India / Public Sector General Insurance Companies',
      desc: 'Accidental death and disability insurance cover for gig, skilled, and informal economy workers.',
      eligibility: 'Citizens aged 18 to 70 years with an operative bank account.',
      benefits: '₹2,00,000 for accidental death or total irrecoverable disability; ₹1,00,000 for permanent partial disability. Annual premium ₹20.',
      docs: 'Aadhaar Card, Bank Account Details, Nominee Declaration',
      url: 'https://jansuraksha.gov.in'
    },
    {
      id: 'sch-pmjay',
      name: 'Ayushman Bharat – Pradhan Mantri Jan Arogya Yojana (AB-PMJAY)',
      provider: 'National Health Authority (NHA)',
      desc: 'Comprehensive secondary and tertiary health insurance coverage for low-income and informal sector families.',
      eligibility: 'Families identified in SECC database and registered eligible unorganised worker categories.',
      benefits: 'Cashless hospitalisation coverage up to ₹5,00,000 per family per year across empaneled public and private hospitals.',
      docs: 'Aadhaar Card, Ration Card, e-Shram Registration UAN',
      url: 'https://pmjay.gov.in'
    },
    {
      id: 'sch-eshram-bima',
      name: 'e-Shram Accidental Social Security Cover',
      provider: 'Ministry of Labour & Employment, Government of India',
      desc: 'Accidental social security cover linked with national e-Shram Universal Account Number (UAN).',
      eligibility: 'All unorganised workers aged 16 to 59 registered on the e-Shram portal.',
      benefits: '₹2,00,000 on accidental death or permanent disability; ₹1,00,000 on partial disability for registered workers.',
      docs: '12-digit e-Shram UAN Card, Bank Account Details',
      url: 'https://eshram.gov.in'
    },
    {
      id: 'sch-coop-welfare',
      name: 'Task Unity Cooperative Worker Welfare Fund',
      provider: 'Task Unity Cooperative Board',
      desc: 'Emergency assistance, tool insurance subsidy, and children education scholarship for active cooperative members.',
      eligibility: 'Active verified workers with at least 25 completed jobs or 3 months cooperative membership.',
      benefits: '₹10,000 emergency medical cash grant, 50% tool replacement subsidy, and cooperative legal protection assistance.',
      docs: 'Task Unity Verified Worker ID, Cooperative Member Passbook',
      url: 'https://taskunity.org/welfare'
    }
  ];

  for (const sch of schemesList) {
    await runQuery(`
      INSERT INTO insurance_schemes (scheme_id, name, provider, description, eligibility, benefits, required_documents, official_url, active, last_verified_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `, [sch.id, sch.name, sch.provider, sch.desc, sch.eligibility, sch.benefits, sch.docs, sch.url, now]);
  }

  // 6. Users: Admin, Worker (Raj Kumar), Customer (Lakshmi), Suresh Verma (Incomplete worker)
  // Admin User
  await runQuery(`
    INSERT INTO users (user_id, role, name, email, phone, password_hash, language, account_status, created_at, updated_at, last_login)
    VALUES ('usr-admin', 'ADMIN', 'Cooperative Administrator', 'admin@taskunity.org', '+91 99000 11223', ?, 'en', 'ACTIVE', ?, ?, ?)
  `, [adminHash, now, now, now]);

  // Customer Lakshmi
  await runQuery(`
    INSERT INTO users (user_id, role, name, email, phone, password_hash, language, account_status, created_at, updated_at, last_login)
    VALUES ('usr-cust-1', 'CUSTOMER', 'Lakshmi Narayanan', 'lakshmi@example.com', '+91 98765 43210', ?, 'en', 'ACTIVE', ?, ?, ?)
  `, [passwordHash, now, now, now]);

  await runQuery(`
    INSERT INTO customers (customer_id, user_id, address, district, state, preferred_language, created_at)
    VALUES ('cust-1', 'usr-cust-1', '14 Gandhipuram 4th Cross', 'Coimbatore', 'Tamil Nadu', 'en', ?)
  `, [now]);

  // Worker Raj Kumar (Fully Verified Active Worker)
  await runQuery(`
    INSERT INTO users (user_id, role, name, email, phone, password_hash, language, account_status, created_at, updated_at, last_login)
    VALUES ('usr-work-1', 'WORKER', 'Raj Kumar', 'raj@example.com', '+91 91234 56789', ?, 'en', 'ACTIVE', ?, ?, ?)
  `, [passwordHash, now, now, now]);

  await runQuery(`
    INSERT INTO workers (worker_id, user_id, onboarding_status, dob, gender, address, district, state, profile_photo, primary_skill_id, secondary_skills, years_experience, preferred_working_area, rating, jobs_completed, insurance_contribution_enabled, created_at, updated_at)
    VALUES ('wrk-1', 'usr-work-1', 'ACTIVE', '1992-04-12', 'Male', '42 Ramanathapuram Main Road', 'Coimbatore', 'Tamil Nadu', '/uploads/workers/raj_kumar.jpg', 'sk-elec', '["Technician", "Plumber"]', 5, 'Coimbatore City (Within 15km)', 4.8, 4, 1, ?, ?)
  `, [now, now]);

  await runQuery(`
    INSERT INTO worker_skills (id, worker_id, skill_id, is_primary, years_experience)
    VALUES ('ws-1', 'wrk-1', 'sk-elec', 1, 5)
  `);

  await runQuery(`
    INSERT INTO worker_availability (availability_id, worker_id, is_available, location_sharing_enabled, last_status_change)
    VALUES ('av-1', 'wrk-1', 1, 1, ?)
  `, [now]);

  await runQuery(`
    INSERT INTO worker_locations (location_id, worker_id, booking_id, latitude, longitude, heading, speed, location_state, updated_at)
    VALUES ('loc-1', 'wrk-1', NULL, 11.0168, 76.9558, 45, 0, 'AVAILABLE', ?)
  `, [now]);

  // e-Shram for Raj Kumar (Verified)
  await runQuery(`
    INSERT INTO eshram_records (eshram_id, worker_id, is_registered, eshram_number, holder_name, document_url, verification_status, verified_by, verified_at, created_at)
    VALUES ('esh-1', 'wrk-1', 1, 'UAN-9842-1029-4581', 'Raj Kumar', '/uploads/docs/eshram_raj.pdf', 'VERIFIED', 'usr-admin', ?, ?)
  `, [now, now]);

  // Certification for Raj Kumar (Verified)
  await runQuery(`
    INSERT INTO certifications (certification_id, worker_id, primary_skill, certification_name, certificate_number, issuing_org, issue_date, expiry_date, document_url, verification_status, verified_by, verified_at, created_at)
    VALUES ('cert-1', 'wrk-1', 'Electrician', 'NSDC Level 4 Electrician Competency Certificate', 'NSDC-ELEC-2021-884', 'National Skill Development Corporation / ITI', '2021-08-15', '2031-08-14', '/uploads/docs/cert_raj.pdf', 'VERIFIED', 'usr-admin', ?, ?)
  `, [now, now]);

  // Insurance Policy for Raj Kumar (Active & Verified)
  await runQuery(`
    INSERT INTO insurance_policies (policy_id, worker_id, provider_or_scheme, policy_number, policy_holder_name, coverage, start_date, expiry_date, document_url, verification_status, verified_by, verified_at, created_at, updated_at)
    VALUES ('pol-1', 'wrk-1', 'ABC Insurance / PMSBY Group Accidental Cover', 'POL-2026-458921', 'Raj Kumar', '₹2,00,000 Accidental & Disability Cover', '2026-09-01', '2027-08-31', '/uploads/docs/policy_raj.pdf', 'VERIFIED', 'usr-admin', ?, ?, ?)
  `, [now, now, now]);

  // Consent for Raj Kumar's Insurance
  await runQuery(`
    INSERT INTO consents (consent_id, user_id, entity_type, entity_id, consent_type, consent_version, accepted, accepted_at, ip_address_or_audit_reference, created_at, updated_at)
    VALUES ('cns-1', 'usr-work-1', 'INSURANCE_POLICY', 'pol-1', 'INSURANCE_TERMS_AND_CONDITIONS', 'v1.0', 1, ?, '127.0.0.1 (Verification Demo Audit)', ?, ?)
  `, [now, now, now]);

  // Historical Contributions for Raj Kumar (as shown in section 24 demo: B1021, B1018, B1010)
  const pastContributions = [
    { id: 'cnt-1', book: 'B1021', pay: 1000, rate: 10, amt: 100, date: '2026-09-19T09:00:00Z', ref: 'TXN-CONT-1021' },
    { id: 'cnt-2', book: 'B1018', pay: 1500, rate: 10, amt: 150, date: '2026-09-18T14:30:00Z', ref: 'TXN-CONT-1018' },
    { id: 'cnt-3', book: 'B1010', pay: 800, rate: 10, amt: 80, date: '2026-09-17T11:15:00Z', ref: 'TXN-CONT-1010' }
  ];

  let ledgerBalance = 0;
  for (const c of pastContributions) {
    ledgerBalance += c.amt;
    await runQuery(`
      INSERT INTO insurance_contributions (contribution_id, worker_id, booking_id, payment_id, payment_amount, contribution_rate, contribution_amount, status, transaction_reference, created_at)
      VALUES (?, 'wrk-1', ?, 'pay-demo', ?, ?, ?, 'RECORDED', ?, ?)
    `, [c.id, c.book, c.pay, c.rate, c.amt, c.ref, c.date]);

    await runQuery(`
      INSERT INTO insurance_fund_ledger (ledger_id, contribution_id, worker_id, booking_id, credit_amount, debit_amount, balance_after, transaction_type, reference, created_at)
      VALUES (?, ?, 'wrk-1', ?, ?, 0, ?, 'JOB_EARNING_CONTRIBUTION', ?, ?)
    `, [`ledg-${c.id}`, c.id, c.book, c.amt, ledgerBalance, c.ref, c.date]);
  }

  // 7. Second Worker: Suresh Verma (Incomplete Worker at Skill Certification pending)
  await runQuery(`
    INSERT INTO users (user_id, role, name, email, phone, password_hash, language, account_status, created_at, updated_at, last_login)
    VALUES ('usr-work-2', 'WORKER', 'Suresh Verma', 'suresh@example.com', '+91 94432 11002', ?, 'en', 'PENDING', ?, ?, ?)
  `, [passwordHash, now, now, now]);

  await runQuery(`
    INSERT INTO workers (worker_id, user_id, onboarding_status, dob, gender, address, district, state, profile_photo, primary_skill_id, secondary_skills, years_experience, preferred_working_area, rating, jobs_completed, insurance_contribution_enabled, created_at, updated_at)
    VALUES ('wrk-2', 'usr-work-2', 'SKILL_CERTIFICATION_PENDING', '1995-10-20', 'Male', '18 Saibaba Colony', 'Coimbatore', 'Tamil Nadu', '', 'sk-plumb', '["Cleaner"]', 3, 'Coimbatore North', 5.0, 0, 0, ?, ?)
  `, [now, now]);

  await runQuery(`
    INSERT INTO eshram_records (eshram_id, worker_id, is_registered, eshram_number, holder_name, document_url, verification_status, verified_by, verified_at, created_at)
    VALUES ('esh-2', 'wrk-2', 1, 'UAN-7712-4491-0021', 'Suresh Verma', '/uploads/docs/eshram_suresh.pdf', 'VERIFIED', 'usr-admin', ?, ?)
  `, [now, now]);

  // 8. Third Worker: Ramesh Patel (Worker who selected NO insurance / Skipped)
  await runQuery(`
    INSERT INTO users (user_id, role, name, email, phone, password_hash, language, account_status, created_at, updated_at, last_login)
    VALUES ('usr-work-3', 'WORKER', 'Ramesh Patel', 'ramesh@example.com', '+91 94432 33445', ?, 'en', 'ACTIVE', ?, ?, ?)
  `, [passwordHash, now, now, now]);

  await runQuery(`
    INSERT INTO workers (worker_id, user_id, onboarding_status, dob, gender, address, district, state, profile_photo, primary_skill_id, secondary_skills, years_experience, preferred_working_area, rating, jobs_completed, insurance_contribution_enabled, created_at, updated_at)
    VALUES ('wrk-3', 'usr-work-3', 'ACTIVE', '1988-02-14', 'Male', '9 Race Course Road', 'Coimbatore', 'Tamil Nadu', '', 'sk-carp', '["Painter"]', 8, 'Coimbatore South', 4.9, 12, 0, ?, ?)
  `, [now, now]);

  await runQuery(`
    INSERT INTO eshram_records (eshram_id, worker_id, is_registered, eshram_number, holder_name, document_url, verification_status, verified_by, verified_at, created_at)
    VALUES ('esh-3', 'wrk-3', 1, 'UAN-8833-2211-5544', 'Ramesh Patel', '/uploads/docs/eshram_ramesh.pdf', 'VERIFIED', 'usr-admin', ?, ?)
  `, [now, now]);

  await runQuery(`
    INSERT INTO certifications (certification_id, worker_id, primary_skill, certification_name, certificate_number, issuing_org, issue_date, expiry_date, document_url, verification_status, verified_by, verified_at, created_at)
    VALUES ('cert-3', 'wrk-3', 'Carpenter', 'Carpentry & Joinery Trade Certificate', 'ITI-CARP-2018-401', 'Government ITI Coimbatore', '2018-05-10', '2028-05-09', '/uploads/docs/cert_ramesh.pdf', 'VERIFIED', 'usr-admin', ?, ?)
  `, [now, now]);

  await runQuery(`
    INSERT INTO worker_availability (availability_id, worker_id, is_available, location_sharing_enabled, last_status_change)
    VALUES ('av-3', 'wrk-3', 1, 1, ?)
  `, [now]);

  await runQuery(`
    INSERT INTO worker_locations (location_id, worker_id, booking_id, latitude, longitude, heading, speed, location_state, updated_at)
    VALUES ('loc-3', 'wrk-3', NULL, 11.0012, 76.9625, 90, 0, 'AVAILABLE', ?)
  `, [now]);

  // 9. Sample AI Demand Forecasts & AI Workforce Allocations
  await runQuery(`
    INSERT INTO demand_forecast (forecast_id, district, skill_name, forecast_period, demand_level, confidence_score, historical_trend, factors_json, generated_at)
    VALUES 
      ('df-1', 'Coimbatore', 'Electrician', 'Next 7 Days', 'High Demand', 0.92, '+18% vs Last Week', '{"monsoon_season": true, "power_grid_fluctuations": "High", "pending_bookings": 42}', ?),
      ('df-2', 'Coimbatore', 'Plumber', 'Next 7 Days', 'High Demand', 0.88, '+24% vs Last Week', '{"monsoon_leakage_surge": true, "expected_requests": 65}', ?),
      ('df-3', 'Coimbatore', 'Carpenter', 'Next 7 Days', 'Medium Demand', 0.79, '+5% vs Last Week', '{"renovation_trend": "Moderate"}', ?),
      ('df-4', 'Coimbatore', 'Painter', 'Next 7 Days', 'Low Demand', 0.84, '-12% vs Last Week', '{"seasonal_pause_due_to_rain": true}', ?)
  `, [now, now, now, now]);

  await runQuery(`
    INSERT INTO worker_allocation (allocation_id, district, skill_name, current_workers, expected_demand, deficit, suggested_action, status, created_at)
    VALUES 
      ('alc-1', 'Coimbatore', 'Plumber', 8, 15, 7, 'Allocate additional plumbers from nearby Tiruppur and Pollachi cooperative zones with transport allowance incentive.', 'RECOMMENDED', ?),
      ('alc-2', 'Coimbatore', 'Electrician', 14, 20, 6, 'Recommend overtime surge bonus and alert off-duty certified electricians to go AVAILABLE.', 'RECOMMENDED', ?)
  `, [now, now]);

  // 10. Sample Complaints & Feedback
  await runQuery(`
    INSERT INTO complaints (complaint_id, user_id, user_role, booking_id, category, priority, description, status, admin_notes, created_at)
    VALUES 
      ('cmp-1', 'usr-work-1', 'WORKER', 'B1010', 'Wrong Job Information', 'Normal', 'Customer description stated normal switchboard change, but site had heavy three-phase industrial wiring.', 'Under Review', 'Investigating booking request details with customer.', ?)
  `, [now]);

  await runQuery(`
    INSERT INTO feedback (feedback_id, user_id, user_role, category, description, status, admin_notes, created_at)
    VALUES 
      ('fb-1021', 'usr-work-1', 'WORKER', 'Mobile App', 'Offline location sync worked smoothly during rain outage.', 'Under Review', 'Forwarded to mobile engineering team.', ?),
      ('fb-1009', 'usr-work-1', 'WORKER', 'Training', 'Requested safety training workshop for solar inverter installations.', 'Reviewed', 'Scheduled for Q4 Cooperative Skill Seminar.', ?)
  `, [now, now]);

  // 11. Initial Audit Log
  await runQuery(`
    INSERT INTO audit_logs (log_id, user_id, action, entity_type, entity_id, details_json, ip_address, created_at)
    VALUES ('log-init', 'usr-admin', 'SYSTEM_INITIALIZATION', 'SYSTEM', 'COOP-TN', '{"status": "initialized", "version": "1.0.0"}', '127.0.0.1', ?)
  `, [now]);

  saveDb();
  console.log('Task Unity database initialized and seeded successfully.');
}
