const API_BASE = '/api';

export async function apiRequest<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: any,
  isFormData: boolean = false
): Promise<T> {
  const token = localStorage.getItem('task_unity_token');
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let requestBody = body;
  if (body && !isFormData) {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: requestBody
  });

  const data = await response.json().catch(() => ({ success: false, message: 'Invalid response from server' }));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export const bookingsApi = {
  getMyBookings: () => apiRequest('/bookings'),
  getById: (id: string) => apiRequest(`/bookings/${id}`),
  create: (data: any) => apiRequest('/bookings', 'POST', data),
  updateStatus: (id: string, status: string, notes?: string, reason?: string) =>
    apiRequest(`/bookings/${id}/status`, 'PATCH', { status, notes, reason }),
  pay: (id: string, paymentMethod: string) =>
    apiRequest(`/bookings/${id}/pay`, 'POST', { payment_method: paymentMethod }),
  rate: (id: string, data: { rating: number; timeliness_rating?: number; review?: string }) =>
    apiRequest(`/bookings/${id}/rate`, 'POST', data),
};

export const adminApi = {
  getOverview: () => apiRequest('/admin/overview'),
  getWorkers: (filters?: Record<string, string>) => {
    const query = filters ? `?${new URLSearchParams(filters).toString()}` : '';
    return apiRequest(`/admin/workers${query}`);
  },
  verifyEshram: (eshramId: string, data: { status: 'VERIFIED' | 'REJECTED'; rejectionReason?: string; notes?: string }) =>
    apiRequest(`/admin/verify/eshram/${eshramId}`, 'POST', data),
  verifyCertification: (certId: string, data: { status: 'VERIFIED' | 'REJECTED'; rejectionReason?: string }) =>
    apiRequest(`/admin/verify/certification/${certId}`, 'POST', data),
  verifyInsurance: (policyId: string, data: { status: 'VERIFIED' | 'REJECTED' | 'UNDER_REVIEW'; rejectionReason?: string }) =>
    apiRequest(`/admin/verify/insurance/${policyId}`, 'POST', data),
  cooperativeApproval: (workerId: string, data: { action: 'APPROVE' | 'REJECT'; notes?: string }) =>
    apiRequest(`/admin/verify/cooperative-approval/${workerId}`, 'POST', data),
  getInsuranceData: () => apiRequest('/admin/insurance'),
  updateContributionRate: (rate: number | string) =>
    apiRequest('/admin/insurance/contribution-rate', 'POST', { rate }),
  getLiveWorkerMap: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest(`/admin/map${query}`);
  },
  getAiDemandForecasting: () => apiRequest('/admin/ai/demand-forecasting'),
  getAiWorkforceAllocation: () => apiRequest('/admin/ai/workforce-allocation'),
  getAuditLogs: () => apiRequest('/admin/audit-logs'),
  updateClaimStatus: (claimId: string, data: { status: string; adminNotes?: string }) =>
    apiRequest(`/admin/claims/${claimId}/status`, 'PATCH', data),
};
