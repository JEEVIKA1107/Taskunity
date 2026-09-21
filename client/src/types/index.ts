export type UserRole = 'WORKER' | 'CUSTOMER' | 'ADMIN';

export type WorkerOnboardingStatus =
  | 'REGISTERED'
  | 'BASIC_PROFILE_PENDING'
  | 'ESHRAM_PENDING'
  | 'ESHRAM_UNDER_REVIEW'
  | 'ESHRAM_REJECTED'
  | 'SKILL_CERTIFICATION_PENDING'
  | 'CERTIFICATION_UNDER_REVIEW'
  | 'CERTIFICATION_REJECTED'
  | 'INSURANCE_DECISION_PENDING'
  | 'INSURANCE_SKIPPED'
  | 'INSURANCE_UNDER_REVIEW'
  | 'INSURANCE_REJECTED'
  | 'INSURANCE_CONTRIBUTION_PENDING'
  | 'COOPERATIVE_PENDING'
  | 'COOPERATIVE_REJECTED'
  | 'ACTIVE'
  | 'SUSPENDED';

export type BookingStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'WORKER_TRAVELLING'
  | 'ARRIVED'
  | 'SERVICE_IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type LocationState =
  | 'OFFLINE'
  | 'AVAILABLE'
  | 'JOB_ASSIGNED'
  | 'TRAVELLING_TO_CUSTOMER'
  | 'ARRIVED'
  | 'SERVICE_IN_PROGRESS'
  | 'COMPLETED';

export interface User {
  user_id: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  language: string;
  account_status: string;
  worker_id?: string;
  customer_id?: string;
  onboarding_status?: WorkerOnboardingStatus;
  pending_step?: string;
}

export interface WorkerProfile {
  worker_id: string;
  user_id: string;
  onboarding_status: WorkerOnboardingStatus;
  dob?: string;
  gender?: string;
  address?: string;
  district?: string;
  state?: string;
  profile_photo?: string;
  primary_skill_id?: string;
  secondary_skills?: string;
  years_experience: number;
  preferred_working_area?: string;
  rating: number;
  jobs_completed: number;
  insurance_contribution_enabled: number;
}

export interface Skill {
  skill_id: string;
  name: string;
  category: string;
  icon: string;
  description?: string;
  active: number;
}

export interface Service {
  service_id: string;
  name: string;
  skill_id: string;
  base_price: number;
  description?: string;
  icon?: string;
  skill_name?: string;
}

export interface InsurancePolicy {
  policy_id: string;
  worker_id: string;
  provider_or_scheme: string;
  policy_number: string;
  policy_holder_name: string;
  coverage: string;
  start_date: string;
  expiry_date: string;
  document_url: string;
  verification_status: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  rejection_reason?: string;
  verified_by?: string;
  verified_at?: string;
}

export interface InsuranceScheme {
  scheme_id: string;
  name: string;
  provider: string;
  description: string;
  eligibility: string;
  benefits: string;
  required_documents: string;
  official_url: string;
  active: number;
  last_verified_at: string;
}

export interface InsuranceContribution {
  contribution_id: string;
  worker_id: string;
  booking_id: string;
  payment_id: string;
  payment_amount: number;
  contribution_rate: number;
  contribution_amount: number;
  status: string;
  transaction_reference: string;
  created_at: string;
}

export interface InsuranceClaim {
  claim_id: string;
  worker_id: string;
  policy_id?: string;
  claim_type: string;
  incident_date: string;
  description: string;
  documents?: string;
  amount_claimed: number;
  status: 'Submitted' | 'Under Review' | 'Documents Required' | 'Approved' | 'Rejected' | 'Settled' | 'Closed';
  admin_notes?: string;
  submitted_at: string;
  resolved_at?: string;
}

export interface Booking {
  booking_id: string;
  id?: string;
  customer_id: string;
  worker_id?: string;
  service_id: string;
  service_name?: string;
  problem_title: string;
  description: string;
  photos?: string;
  customer_address: string;
  customer_lat: number;
  customer_lng: number;
  worker_lat?: number;
  worker_lng?: number;
  eta_minutes?: number;
  scheduled_time: string;
  status: BookingStatus;
  total_amount: number;
  final_amount?: number;
  estimated_amount?: number;
  payment_status?: string;
  rating?: number;
  timeliness_rating?: number;
  insurance_deduction?: number;
  created_at: string;
  updated_at: string;
  worker_name?: string;
  worker_phone?: string;
  worker_rating?: number;
  customer_name?: string;
  customer_phone?: string;
  skill_name?: string;
  invoice_number?: string;
  invoice_status?: string;
  net_earnings?: number;
  insurance_contribution?: number;
}

export interface Invoice {
  invoice_id: string;
  invoice_number: string;
  booking_id: string;
  customer_id: string;
  worker_id: string;
  service_amount: number;
  insurance_contribution: number;
  net_earnings: number;
  status: string;
  created_at: string;
}

export interface FeedbackItem {
  feedback_id: string;
  user_id: string;
  user_role: string;
  category: string;
  description: string;
  status: string;
  admin_notes?: string;
  created_at: string;
}

export interface ComplaintItem {
  complaint_id: string;
  user_id: string;
  user_role: string;
  booking_id?: string;
  category: string;
  priority: 'Normal' | 'Urgent' | 'Emergency';
  description: string;
  status: 'Submitted' | 'Assigned' | 'Under Review' | 'Waiting for Information' | 'Resolved' | 'Closed';
  admin_notes?: string;
  created_at: string;
  resolved_at?: string;
}

export interface DemandForecast {
  forecast_id: string;
  district: string;
  skill_name: string;
  forecast_period: string;
  demand_level: string;
  confidence_score: number;
  historical_trend: string;
  factors_json: string;
  generated_at: string;
}

export interface WorkerAllocation {
  allocation_id: string;
  district: string;
  skill_name: string;
  current_workers: number;
  expected_demand: number;
  deficit: number;
  suggested_action: string;
  status: string;
  created_at: string;
}
