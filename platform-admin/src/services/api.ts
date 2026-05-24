import axios from 'axios';

let API_BASE = import.meta.env.VITE_BACKEND_URL || '';
if (API_BASE && !API_BASE.endsWith('/api')) {
  API_BASE = `${API_BASE}/api`;
} else if (!API_BASE) {
  API_BASE = '/api';
}

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 → redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { college_id: email, password }),
  me: () => api.get('/auth/me'),
};

// SuperAdmin
export const superadminAPI = {
  // Platform
  platformOverview: () => api.get('/superadmin/platform/overview'),

  // Colleges
  listColleges: () => api.get('/superadmin/colleges'),
  createCollege: (data: any) => api.post('/superadmin/colleges', data),
  updateCollege: (id: string, data: any) => api.put(`/superadmin/colleges/${id}`, data),
  deactivateCollege: (id: string) => api.delete(`/superadmin/colleges/${id}`),
  collegeStats: (id: string) => api.get(`/superadmin/colleges/${id}/stats`),

  // Modules
  getModules: (collegeId: string) => api.get(`/superadmin/colleges/${collegeId}/modules`),
  toggleModules: (collegeId: string, modules: Record<string, boolean>) =>
    api.put(`/superadmin/colleges/${collegeId}/modules`, { modules }),

  // Hostels
  listHostels: (collegeId?: string) =>
    api.get(collegeId ? `/superadmin/hostels?college_id=${collegeId}` : '/superadmin/hostels'),
  createHostel: (data: any) => api.post('/superadmin/hostels', data),
  listRooms: (hostelId: string) => api.get(`/superadmin/hostels/${hostelId}/rooms`),
  createRoom: (data: any) => api.post('/superadmin/rooms', data),
  bulkCreateRooms: (data: any) => api.post('/superadmin/rooms/bulk', data),
  
  // Floor Layouts
  getFloorLayouts: (hostelId: string) => api.get(`/superadmin/hostels/${hostelId}/floor-layouts`),
  getFloorLayout: (hostelId: string, floor: number) => api.get(`/superadmin/hostels/${hostelId}/floor-layout/${floor}`),
  saveFloorLayout: (hostelId: string, floor: number, layout: any) => api.put(`/superadmin/hostels/${hostelId}/floor-layout/${floor}`, layout),

  // Beds
  getRoomBeds: (roomId: string) => api.get(`/superadmin/rooms/${roomId}/beds`),
  saveRoomBeds: (roomId: string, beds: any[]) =>
    api.post(`/superadmin/rooms/${roomId}/beds`, { beds }),

  // Templates
  listTemplates: () => api.get('/superadmin/room-templates'),
  createTemplate: (data: any) => api.post('/superadmin/room-templates', data),
  applyTemplate: (roomId: string, templateId: string) =>
    api.post(`/superadmin/rooms/${roomId}/apply-template/${templateId}`),

  // Billing
  billingOverview: () => api.get('/superadmin/billing/overview'),
};

// Accreditation
export const accreditationAPI = {
  getNirfPreview: (collegeId: string, academicYear: string) => 
    api.get(`/reports/nirf-preview/${collegeId}?academic_year=${academicYear}`),
  generateReport: (data: { report_type: string, academic_year: string, department_id?: string, college_id?: string }) =>
    api.post('/reports/generate', data),
  getReportStatus: (jobId: string) => 
    api.get(`/reports/status/${jobId}`)
};

export default api;
