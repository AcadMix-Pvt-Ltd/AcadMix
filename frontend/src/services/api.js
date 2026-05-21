import axios from 'axios';

let API_URL = import.meta.env.VITE_BACKEND_URL || '';
if (API_URL && !API_URL.endsWith('/api')) {
  API_URL = `${API_URL}/api`;
} else if (!API_URL) {
  API_URL = '/api';
}

export const api = axios.create({
  baseURL: API_URL,
  headers: { 
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
  },
});

// Store token for non-cookie auth
let authToken = null;
let isRefreshing = false;
let refreshSubscribers = [];

/**
 * Detect tenant slug from the current hostname.
 * e.g., "demo.acadmix.org" → "demo", "localhost" → null
 */
function detectTenantSlug() {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return null;
  if (hostname.endsWith('.localhost')) return hostname.replace('.localhost', '');
  const parts = hostname.split('.');
  if (parts.length >= 3 && parts[0] !== 'www') return parts[0];
  return null;
}

const tenantSlug = detectTenantSlug();

const onRefreshed = (newToken) => {
  refreshSubscribers.forEach(cb => cb(newToken));
  refreshSubscribers = [];
};

api.interceptors.request.use((config) => {
  const isPublicRoute = config.url && config.url.includes('/pre-enroll/');
  if (authToken && !isPublicRoute) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  // Inject tenant header for multi-tenant routing
  if (tenantSlug) {
    config.headers['X-Tenant'] = tenantSlug;
  }
  return config;
});

// Response interceptor: unwrap envelope + attempt silent refresh on 401
api.interceptors.response.use(
  (response) => {
    // If Vercel mistakenly serves index.html instead of a backend API response, reject it immediately
    if (typeof response.data === 'string' && response.data.trim().startsWith('<!doctype html>')) {
      return Promise.reject(new Error('Received HTML instead of JSON. Ensure VITE_BACKEND_URL is set correctly in Vercel.'));
    }

    // Unwrap the standard envelope: {data: <payload>, error: null} → <payload>
    // This lets all existing "res.data.xxx" patterns work transparently.
    // Bucket A responses already have {"data": ...} and set X-Envelope-Applied,
    // so they pass through the middleware unchanged — no double-unwrap risk.
    const body = response.data;
    if (body && typeof body === 'object' && 'data' in body && 'error' in body && body.error === null) {
      response.data = body.data;
    }
    return response;
  },
  async (error) => {
    // Standardize backend DomainException structure for frontend components
    if (error.response?.data && error.response.data.error) {
      error.response.data.detail = error.response.data.error;
    } else if (error.response?.data?.data && error.response.data.data.detail) {
      // Handle enveloped FastAPI HTTPExceptions (e.g. 422 Unprocessable Entity)
      error.response.data.detail = error.response.data.data.detail;
    }

    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/')) {
      originalRequest._retry = true;
      
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const { data } = await api.post('/auth/refresh');
          if (data.access_token) {
            authToken = data.access_token;
            localStorage.setItem('auth_token', data.access_token);
            onRefreshed(data.access_token);
          }
        } catch {
          // Refresh failed — both tokens are dead. Force immediate logout.
          authToken = null;
          localStorage.removeItem('auth_token');
          sessionStorage.clear();
          refreshSubscribers = [];
          isRefreshing = false;
          // Hard redirect to login — React state is stale at this point
          window.location.replace('/login');
          return Promise.reject(error);
        }
        isRefreshing = false;
      }

      // Queue this request until refresh resolves
      return new Promise((resolve) => {
        refreshSubscribers.push((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(originalRequest));
        });
      });
    }
    return Promise.reject(error);
  }
);

export const setAuthToken = (token) => {
  authToken = token;
};

export const clearAuthToken = () => {
  authToken = null;
};

export function formatApiError(detail) {
  if (detail == null) return 'Something went wrong.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e?.msg || JSON.stringify(e))).join(' ');
  if (detail?.msg) return detail.msg;
  return String(detail);
}

// Auth
export const authAPI = {
  login: (college_id, password) => api.post('/auth/login', { college_id, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  heartbeat: () => api.post('/auth/heartbeat'),
};

export const usersAPI = {
  list: (role) => api.get('/users', { params: role ? { role } : {} }),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// Departments
export const departmentsAPI = {
  list: () => api.get('/departments'),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
};

// Sections
export const sectionsAPI = {
  list: () => api.get('/sections'),
  create: (data) => api.post('/sections', data),
  update: (id, data) => api.put(`/sections/${id}`, data),
  delete: (id) => api.delete(`/sections/${id}`),
};

// Roles
export const rolesAPI = {
  list: () => api.get('/roles'),
  create: (data) => api.post('/roles', data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  delete: (id) => api.delete(`/roles/${id}`),
};

// Quizzes
export const quizzesAPI = {
  list: (status) => api.get('/quizzes', { params: status ? { status } : {} }),
  myQuizzes: () => api.get('/quizzes/user'),
  liveMonitor: (quizId) => api.get(`/quizzes/live/${quizId}`),
  extendTime: (quizId, mins = 10) => api.post(`/quizzes/${quizId}/extend-time`, { mins }),
  endQuiz: (quizId) => api.post(`/quizzes/${quizId}/end`),
  get: (id) => api.get(`/quizzes/${id}`),
  create: (data) => api.post('/quizzes', data),
  update: (id, data) => api.patch(`/quizzes/${id}`, data),
  delete: (id) => api.delete(`/quizzes/${id}`),
  publish: (id) => api.post(`/quizzes/${id}/publish`),
};

// Attempts
export const attemptsAPI = {
  start: (quizId) => api.post(`/quizzes/${quizId}/start`),
  answer: (attemptId, data) => api.post(`/attempts/${attemptId}/answer`, data),
  submit: (attemptId) => api.post(`/attempts/${attemptId}/submit`),
  result: (attemptId) => api.get(`/attempts/${attemptId}/result`),
  list: (quizId) => api.get('/attempts', { params: quizId ? { quiz_id: quizId } : {} }),
  violation: (attemptId) => api.post(`/attempts/${attemptId}/violation`),
  logTelemetryViolation: (attemptId) => api.post(`/quizzes/attempts/${attemptId}/telemetry/violation`),
};

// Code Execution
export const codeAPI = {
  execute: (code, language, test_input) => api.post('/code/execute', { code, language, test_input }),
};

// Faculty Management (HOD)
export const facultyAPI = {
  teachers: (department) => api.get('/faculty/teachers', { params: department ? { department } : {} }),
  assignments: () => api.get('/faculty/assignments'),
  createAssignment: (data) => api.post('/faculty/assignments', data),
  deleteAssignment: (id) => api.delete(`/faculty/assignments/${id}`),
};

// Marks Entry (Teacher)
export const marksAPI = {
  myAssignments: () => api.get('/marks/my-assignments'),
  students: (department, batch, section) => api.get('/marks/students', { params: { department, batch, section } }),
  getEntry: (assignmentId, examType) => api.get(`/marks/entry/${assignmentId}/${examType}`),
  saveEntry: (data) => api.post('/marks/entry', data),
  submit: (entryId) => api.put(`/marks/entry/${entryId}/submit`),
  submissions: (status) => api.get('/marks/submissions', { params: status ? { status } : {} }),
  review: (entryId, data) => api.put(`/hod/marks/entry/${entryId}/review`, data),
};

// Exam Cell
export const examCellAPI = {
  approvedMarks: () => api.get('/examcell/approved-marks'),
  endtermList: () => api.get('/examcell/endterm'),
  saveEndterm: (data) => api.post('/examcell/endterm', data),
  uploadFile: (formData) => api.post('/examcell/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  publish: (entryId) => api.post(`/examcell/publish/${entryId}`),
  hodDashboard: () => api.get('/dashboard/hod'),
  examCellDashboard: () => api.get('/dashboard/exam_cell'),
};

// Students Search & Profile
export const studentsAPI = {
  search: (q, department, limit, offset) => api.get('/students/search', { params: { q, ...(department ? { department } : {}), ...(limit ? { limit } : {}), ...(offset ? { offset } : {}) } }),
  profile: (studentId) => api.get(`/students/${studentId}/profile`),
};

// Results
export const resultsAPI = {
  semester: (studentId) => api.get(`/results/semester/${studentId}`),
  createSemester: (data) => api.post('/results/semester', data),
};

// Analytics & Dashboard
export const analyticsAPI = {
  student: (studentId) => api.get(`/analytics/student/${studentId}`),
  classResults: () => api.get('/analytics/teacher/class-results'),
  quizDetails: (quizId, department, batch, section) => api.get(`/analytics/teacher/quiz-results/${quizId}`, { params: { department, batch, section } }),
  leaderboard: () => api.get('/leaderboard'),
  studentDashboard: () => api.get('/dashboard/student'),
  teacherDashboard: () => api.get('/dashboard/teacher'),
  adminDashboard: () => api.get('/dashboard/admin'),
};

// Placements
export const placementsAPI = {
  studentPlacements: () => api.get('/placements/student'),
  applyToDrive: (driveId, data) => api.post(`/placements/drives/${driveId}/apply`, data),
  scoreResume: (driveId, data) => api.post(`/placements/drives/${driveId}/ats-score`, data),
};

// Student Panel (DHTE spec)
export const studentAPI = {
  attendanceDetail: (params) => api.get('/student/attendance/detail', { params }),
  ciaMarks: (params) => api.get('/student/cia-marks', { params }),
  academicCalendar: () => api.get('/student/academic-calendar'),
  subjects: () => api.get('/student/subjects'),
  hallTicket: (semester, academic_year) => api.get('/student/hall-ticket', { params: { semester, academic_year } }),
  myRegistrations: () => api.get('/student/my-registrations'),
};

// Timetable (HOD & Faculty)
export const timetableAPI = {
  getHod: (departmentId, batch, section, academicYear) => api.get('/hod/timetable', { params: { department_id: departmentId, batch, section, academic_year: academicYear } }),
  saveHod: (data) => api.put('/hod/timetable/slots', data),
  delete: (slotId) => api.delete(`/timetable/${slotId}`),
  getFacultyToday: () => api.get('/faculty/timetable/today'),
  getFacultyWeek: () => api.get('/faculty/timetable/today', { params: { week: true } }),
  getStudentTimetable: () => api.get('/student/timetable'),
};

// Faculty Panel (DHTE spec Phase 6)
export const facultyPanelAPI = {
  teachingRecords: (params) => api.get('/faculty/teaching-records', { params }),
  saveTeachingPlan: (data) => api.post('/faculty/teaching-plan', data),
  saveClassRecord: (data) => api.post('/faculty/class-record', data),
  updateTeachingRecord: (id, data) => api.patch(`/faculty/teaching-records/${id}`, data),
  getProfile: () => api.get('/faculty/profile'),
  updateProfile: (data) => api.put('/faculty/profile', data),
  ciaDashboard: () => api.get('/faculty/cia-dashboard'),
  getSubjectCIA: (subjectCode, academicYear) => api.get(`/subjects/${subjectCode}/cia-template`, { params: { academic_year: academicYear } }),
  myMentees: () => api.get('/faculty/my-mentees'),
};

export const outcomesAPI = {
  getMatrix: (courseId) => api.get(`/courses/${courseId}/outcomes`),
  saveMatrix: (courseId, payload) => api.post(`/courses/${courseId}/co-po-mapping`, payload),
  generateAIOutcomes: (courseId) => api.post(`/courses/${courseId}/ai-generate-outcomes`),
};

export const assessmentsAPI = {
  generate: (courseId, payload) => api.post(`/courses/${courseId}/generate-assessment`, payload),
  commit: (courseId, payload) => api.post(`/courses/${courseId}/commit-assessment`, payload),
};

export const attendanceAPI = {
  mark: (data) => api.post('/faculty/attendance/mark', data),
  getStudentConsolidated: () => api.get('/student/attendance'),
  getHodDefaulters: (departmentId, threshold) => api.get('/hod/attendance/defaulters', { params: { department_id: departmentId, threshold } }),
};

// Syllabus Tracker
export const syllabusAPI = {
  getTopicsBySubject: (subjectCode) => api.get(`/syllabus/topics-by-subject/${subjectCode}`),
  getSyllabus: (courseId) => api.get(`/syllabus/${courseId}`),
  upsertSyllabus: (courseId, data) => api.post(`/syllabus/${courseId}`, data),
  hodCoverage: () => api.get('/hod/syllabus/coverage'),
  principalCoverage: () => api.get('/principal/syllabus/coverage'),
};

// Leave Management
export const leaveAPI = {
  apply: (data) => api.post('/leave/apply', data),
  myLeaves: () => api.get('/leave/my'),
  cancel: (leaveId, data) => api.patch(`/leave/${leaveId}/cancel`, data || {}),
};

// Announcements (HOD)
export const announcementsAPI = {
  list: () => api.get('/announcements'),
  create: (data) => api.post('/announcements', data),
  delete: (id) => api.delete(`/announcements/${id}`),
};

// HOD Tools
export const hodToolsAPI = {
  atRiskStudents: (threshold = 5.0) => api.get('/hod/at-risk-students', { params: { threshold } }),
};

// Phase 1: Permissions & CIA
export const adminPhase1API = {
  getPermissionsSummary: () => api.get('/admin/permissions/summary'),
  updateUserPermissions: (userId, flags) => api.put(`/admin/users/${userId}/permissions`, { flags }),
  
  getCiaTemplates: () => api.get('/admin/cia-templates'),
  createCiaTemplate: (data) => api.post('/admin/cia-templates', data),
  updateCiaTemplate: (id, data) => api.put(`/admin/cia-templates/${id}`, data),
  deleteCiaTemplate: (id) => api.delete(`/admin/cia-templates/${id}`),
  
  getCiaConfigs: () => api.get('/admin/cia-config'),
  createCiaConfig: (data) => api.post('/admin/cia-config', data),
  toggleConsolidation: (id) => api.put(`/admin/cia-config/${id}/enable-consolidation`),
};

// Phase 2: HOD Dashboard Governance
export const hodAssignmentsAPI = {
  // Assignments
  getClassInCharges: () => api.get('/hod/assignments/class-in-charge'),
  createClassInCharge: (data) => api.post('/hod/assignments/class-in-charge', data),
  deleteClassInCharge: (id) => api.delete(`/hod/assignments/class-in-charge/${id}`),
  
  getMentors: () => api.get('/hod/assignments/mentors'),
  createMentors: (data) => api.post('/hod/assignments/mentors', data),
  deactivateMentor: (id) => api.delete(`/hod/assignments/mentors/${id}`),
};

export const hodProgressionAPI = {
  // Progression
  getProgression: (studentId) => api.get(`/faculty/students/${studentId}/progression`),
  createProgression: (data) => api.post('/hod/progression', data),
  deleteProgression: (id) => api.delete(`/hod/progression/${id}`),
};

export const hodLeaveAPI = {
  // Leave Cancellation
  requestCancellation: (leaveId, partialDates) => api.patch(`/leave/${leaveId}/cancel`, partialDates || {}),
  reviewCancellation: (leaveId, data) => api.patch(`/hod/leave/${leaveId}/review-cancellation`, data),
};

export const tpoAPI = {
  getCompanies: () => api.get('/tpo/companies'),
  createCompany: (data) => api.post('/tpo/companies', data),
  getDrives: () => api.get('/tpo/drives'),
  createDrive: (data) => api.post('/tpo/drives', data),
  updateDrive: (id, data) => api.put(`/tpo/drives/${id}`, data),
  getApplicants: (id) => api.get(`/tpo/drives/${id}/applicants`),
  shortlistBulk: (id, ids) => api.put(`/tpo/drives/${id}/shortlist`, { student_ids: ids }),
  logResult: (id, data) => api.put(`/tpo/drives/${id}/results`, data),
  selectCandidate: (id, data) => api.put(`/tpo/drives/${id}/select`, data),
  getStats: () => api.get('/tpo/statistics'),
  previewExcel: (driveId, formData) => api.post(`/tpo/drives/${driveId}/preview-excel`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadStudents: (driveId, formData) => api.post(`/tpo/drives/${driveId}/upload-students`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// Notifications — In-App + Browser Push
export const notificationsAPI = {
  getAll: (params = {}) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  subscribePush: (subscription) => api.post('/notifications/subscribe', subscription),
  unsubscribePush: (endpoint) => api.post('/notifications/unsubscribe', { endpoint }),
};

export const alumniAPI = {
  // Alumni Self-Service
  getProfile: () => api.get('/alumni/profile'),
  updateProfile: (data) => api.put('/alumni/profile', data),
  getDirectory: () => api.get('/alumni/directory'),
  getJobPostings: () => api.get('/alumni/job-postings'),
  postJobReferral: (data) => api.post('/alumni/job-postings', data),
  respondMentorship: (id, status) => api.post(`/alumni/mentorship/${id}/respond`, { status }),
  addMentorshipNote: (id, note) => api.post(`/alumni/mentorship/${id}/session-note`, { note }),
  getEvents: () => api.get('/alumni/events'),
  rsvpEvent: (id, status) => api.post(`/alumni/events/${id}/register`, { rsvp_status: status }),
  submitAchievement: (data) => api.post('/alumni/achievements', data),
  submitFeedback: (data) => api.post('/alumni/feedback', data),
  updateHigherStudies: (data) => api.put('/alumni/progression/higher-studies', data),

  // Student Endpoints
  getStudentJobs: () => api.get('/student/alumni-jobs'),
  getAvailableMentors: () => api.get('/student/alumni-mentors'),
  requestMentorship: (data) => api.post('/student/alumni-mentorship/request', data),

  // Admin Endpoints
  batchGraduate: (batch, dept, dryRun) => api.post(`/admin/alumni/batch-graduate?batch=${batch}&department=${dept || ''}&dry_run=${dryRun}`),
  getPending: () => api.get('/admin/alumni/pending'),
  verifyProfile: (id, action) => api.put(`/admin/alumni/${id}/verify`, { action }),
  addContribution: (data) => api.post('/admin/alumni/contributions', data),
  getOutcomesReport: () => api.get('/admin/reports/alumni-outcomes'),
  createEvent: (data) => api.post('/admin/alumni-events', data),
  updateEvent: (id, data) => api.put(`/admin/alumni-events/${id}`, data),
  markAttendance: (id, ids) => api.put(`/admin/alumni-events/${id}/attendance`, { attended_alumni_ids: ids }),
  verifyAchievement: (id, verified, featured) => api.put(`/admin/alumni/achievements/${id}/verify`, { is_verified: verified, is_featured: featured }),
};

export const parentAPI = {
  getChildren: () => api.get('/parent/children'),
  getAcademics: (id) => api.get(`/parent/children/${id}/academics`),
  getAttendance: (id) => api.get(`/parent/children/${id}/attendance`),
  getCIAMarks: (id) => api.get(`/parent/children/${id}/cia-marks`),
  getTimetable: (id) => api.get(`/parent/children/${id}/timetable`),
  getSubjects: (id) => api.get(`/parent/children/${id}/subjects`),
  getExamSchedule: (id) => api.get(`/parent/children/${id}/exam-schedule`),
  getLeaves: (id) => api.get(`/parent/children/${id}/leaves`),
  getFacultyContacts: (id) => api.get(`/parent/children/${id}/faculty-contacts`),
  getMentor: (id) => api.get(`/parent/children/${id}/mentor`),
  getAcademicCalendar: () => api.get('/parent/academic-calendar'),
  updateNotificationPrefs: (prefs) => api.put('/parent/notification-preferences', prefs),
};

export const grievanceAPI = {
  submit: (data) => api.post('/grievances', data),
  getMine: () => api.get('/grievances/my'),
  getAll: (params) => api.get('/admin/grievances', { params }),
  resolve: (id, data) => api.put(`/admin/grievances/${id}/resolve`, data),
};

export const industryAPI = {
  getDashboard: () => api.get('/industry/dashboard'),
  getMOUs: () => api.get('/industry/mous'),
  createMOU: (data) => api.post('/industry/mous', data),
  getProjects: () => api.get('/industry/projects'),
  createProject: (data) => api.post('/industry/projects', data),
  requestDrive: (data) => api.post('/industry/drives', data),
  submitCurriculumFeedback: (data) => api.post('/industry/curriculum-feedback', data),
  submitEmployerFeedback: (data) => api.post('/industry/employer-feedback', data),
  scheduleTrainingProgram: (data) => api.post('/industry/training-programs', data),
};

export default api;

export const principalAPI = {
  dashboard: () => api.get('/principal/dashboard'),
  attendanceCompliance: (year) => api.get('/principal/reports/attendance-compliance', { params: { academic_year: year } }),
  academicPerformance: (semester, year) => api.get('/principal/reports/academic-performance', { params: { semester, academic_year: year } }),
  ciaStatus: (year) => api.get('/principal/reports/cia-status', { params: { academic_year: year } }),
  staffProfiles: () => api.get('/principal/reports/staff-profiles'),
  infrastructure: () => api.get('/principal/infrastructure'),
  extensionActivities: () => api.get('/principal/reports/extension-activities'),
  institutionProfile: () => api.get('/principal/institution-profile'),
  updateInstitutionProfile: (data) => api.put('/principal/institution-profile', data),
  grievances: (params) => api.get('/admin/grievances', { params }),
  reassignGrievance: (id, data) => api.put('/principal/grievances/' + id + '/reassign', data),
  pendingLeaves: () => api.get('/principal/leave/pending'),
  approveLeave: (id, data) => api.put('/hod/leave/' + id + '/review', data),
  activityReports: () => api.get('/principal/activity-reports'),
  placementPlaceholder: () => api.get('/principal/reports/placement'),
  tasksPlaceholder: () => api.get('/principal/tasks'),
  meetingsPlaceholder: () => api.get('/principal/meetings'),
  annualReportExportUrl: (year) => api.defaults.baseURL + '/principal/reports/annual?academic_year=' + year,
  annualReport: (year) => api.get('/principal/reports/annual?academic_year=' + year),
  calendarEvents: (data) => api.post('/principal/calendar-events', data)
};

export const retiredFacultyAPI = {
  // Self-service
  dashboard: () => api.get('/retired-faculty/dashboard'),
  myRoles: () => api.get('/retired-faculty/my-roles'),
  getResearch: () => api.get('/retired-faculty/research'),
  createResearch: (data) => api.post('/retired-faculty/research', data),
  getConsultancy: () => api.get('/retired-faculty/consultancy'),
  createConsultancy: (data) => api.post('/retired-faculty/consultancy', data),
  myEntitlements: () => api.get('/retired-faculty/my-entitlements'),
  registerEvent: (eventId) => api.post('/retired-faculty/events/' + eventId + '/register'),
  // Admin
  availableLecturers: () => api.get('/admin/retired-faculty/available-lecturers'),
  createAdvisoryRole: (userId, data) => api.post('/admin/retired-faculty/' + userId + '/advisory-roles', data),
  getEntitlements: (userId) => api.get('/admin/retired-faculty/' + userId + '/entitlements'),
  updateEntitlements: (userId, data) => api.put('/admin/retired-faculty/' + userId + '/entitlements', data),
  researchReport: () => api.get('/admin/reports/retired-faculty-research'),
  consultancyReport: () => api.get('/admin/reports/consultancy'),
};

export const expertAPI = {
  dashboard: () => api.get('/expert/dashboard'),
  myAssignments: () => api.get('/expert/my-assignments'),
  getQuestionPapers: () => api.get('/expert/question-papers'),
  reviewQuestionPaper: (id, data) => api.put(`/expert/question-papers/${id}/review`, data),
  getStudyMaterials: () => api.get('/expert/study-materials'),
  reviewStudyMaterial: (id, data) => api.put(`/expert/study-materials/${id}/review`, data),
  submitEvaluation: (data) => api.post('/expert/evaluations', data),
};
export const nodalAPI = {
  getColleges: () => api.get('/nodal/colleges'),
  getAttendanceCompliance: () => api.get('/nodal/reports/attendance-compliance'),
  getResultsStatus: () => api.get('/nodal/reports/results-status'),
  getCiaSubmission: () => api.get('/nodal/reports/cia-submission'),
  getFacultyProfiles: () => api.get('/nodal/reports/faculty-profiles'),
  getAccreditation: () => api.get('/nodal/reports/accreditation'),
  getActivityReports: () => api.get('/nodal/activity-reports'),
  acknowledgeActivity: (id, data) => api.put(`/nodal/activity-reports/${id}/acknowledge`, data),
  acknowledgeCircular: (id) => api.post(`/admin/circulars/${id}/acknowledge`),
  getCirculars: () => api.get('/nodal/circulars'),
  createSubmissionRequirement: (data) => api.post('/nodal/submission-requirements', data),
  getSubmissionsStatus: () => api.get('/nodal/submissions/status'),
  assignExpert: (data) => api.post('/nodal/experts/assign', data),
  createInspection: (data) => api.post('/nodal/inspections', data),
  getInspections: () => api.get('/nodal/inspections'),
};

// Fee Management & Razorpay
export const feesAPI = {
  getDue: () => api.get('/fees/due'),
  getHistory: () => api.get('/fees/history'),
  createOrder: (data) => api.post('/fees/create-order', data),
  verifyPayment: (data) => api.post('/fees/verify-payment', data),
  bulkGenerateInvoices: (data) => api.post('/admin/fees/invoices/bulk', data),
  getReceipt: (receiptNo) => api.get(`/fees/receipts/${receiptNo}`),
  verifyReceipt: (token) => api.get(`/fees/receipts/verify/${token}`),
  financeSummary: () => api.get('/finance/summary'),
  searchStudents: (q) => api.get('/finance/students/search', { params: { q } }),
  studentLedger: (studentId) => api.get(`/finance/students/${studentId}/ledger`),
  cancelInvoice: (id, data) => api.post(`/finance/invoices/${id}/cancel`, data),
  listFeeStructures: (params = {}) => api.get('/finance/fee-structures', { params }),
  createFeeStructure: (data) => api.post('/finance/fee-structures', data),
  updateFeeStructure: (id, data) => api.put(`/finance/fee-structures/${id}`, data),
  deleteFeeStructure: (id) => api.delete(`/finance/fee-structures/${id}`),
  addFeeStructureItem: (id, data) => api.post(`/finance/fee-structures/${id}/items`, data),
  allocationTargets: (data) => api.post('/finance/allocations/targets', data),
  generateAllocations: (data) => api.post('/finance/allocations/generate', data),
  financeWorkQueue: () => api.get('/finance/work-queue'),
  searchReceipts: (q) => api.get('/finance/receipts/search', { params: { q } }),
  financeReports: (params = {}) => api.get('/finance/reports', { params }),
  createConcession: (data) => api.post('/finance/concessions', data),
  reviewConcession: (id, data) => api.put(`/finance/concessions/${id}/review`, data),
  createRefund: (data) => api.post('/finance/refunds', data),
  reviewRefund: (id, data) => api.put(`/finance/refunds/${id}/review`, data),
  currentCashierSession: () => api.get('/cashier/sessions/current'),
  openCashierSession: (data) => api.post('/cashier/sessions/open', data),
  closeCashierSession: (data) => api.post('/cashier/sessions/close', data),
  collectCashierFee: (data) => api.post('/cashier/collections', data),
  cashierDayClose: () => api.get('/cashier/day-close'),
  cashierSessionHistory: () => api.get('/cashier/sessions/history'),
};

// Interview War Room — AI Mock Interviews
export const interviewAPI = {
  getQuota: () => api.get('/interview/quota'),
  start: (data) => api.post('/interview/start', data),
  sendMessage: (id, data) => api.post(`/interview/${id}/message`, data),
  end: (id) => api.post(`/interview/${id}/end`),
  history: () => api.get('/interview/history'),
  get: (id) => api.get(`/interview/${id}`),
  readiness: () => api.get('/interview/readiness'),
};

// Interview War Room — Resume ATS Scoring
export const resumeAPI = {
  upload: (formData) => api.post('/resume/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  score: (id, data) => api.post(`/resume/${id}/score`, data),
  history: () => api.get('/resume/history'),
  latest: () => api.get('/resume/latest'),
};

// Resume Vault — Persistent resume file storage (R2)
export const resumeVaultAPI = {
  upload: (formData) => api.post('/resume-vault/upload', formData, { headers: { 'Content-Type': undefined } }),
  list: () => api.get('/resume-vault/'),
  getPrimary: () => api.get('/resume-vault/primary'),
  setPrimary: (id) => api.patch(`/resume-vault/${id}/primary`),
  remove: (id) => api.delete(`/resume-vault/${id}`),
  download: (id) => api.get(`/resume-vault/${id}/download`, { responseType: 'blob' }),
};

// Career Toolkit — AI-Powered Career Prep Tools
export const careerAPI = {
  coverLetter: (data) => api.post('/career/cover-letter', data),
  analyzeJD: (data) => api.post('/career/jd-analyze', data),
  coldEmail: (data) => api.post('/career/cold-email', data),
  skillGap: (data) => api.post('/career/skill-gap', data),
  hrQuestions: (data) => api.post('/career/hr-questions', data),
  dsaRecommend: (data) => api.post('/career/dsa-recommend', data),
  careerPaths: (data) => api.post('/career/career-paths', data),
  companyIntel: () => api.get('/career/company-intel'),
};

// Resume Profile — Student-editable resume enrichment data
export const resumeProfileAPI = {
  get: () => api.get('/student/resume-profile'),
  update: (data) => api.put('/student/resume-profile', data),
  verifySocial: (platform, username) => api.get('/student/verify-social-profile', { params: { platform, username } }),
  generateDocx: (template = 'classic') => api.post('/student/resume/generate-docx', { template }, { responseType: 'blob' }),
};

// Hostel Management — Sleeper Bus Bed Booking
export const hostelAPI = {
  // Student booking funnel
  getAvailableHostels: () => api.get('/hostel/available'),
  getFloors: (hostelId) => api.get(`/hostel/buildings/${hostelId}/floors`),
  getRoomGrid: (roomId) => api.get(`/hostel/rooms/${roomId}/grid`),
  lockBed: (data) => api.post('/hostel/beds/lock', data),
  confirmBooking: (data) => api.post('/hostel/beds/confirm', data),
  getMyAllocation: () => api.get('/hostel/my-allocation'),

  // Gatepasses
  applyGatepass: (data) => api.post('/hostel/gatepasses/apply', data),
  myGatepasses: () => api.get('/hostel/gatepasses/my'),

  // Warden/Admin — Buildings
  getBuildings: () => api.get('/hostel/buildings'),
  createBuilding: (data) => api.post('/hostel/buildings', data),
  getRooms: (hostelId, floor) => api.get(`/hostel/buildings/${hostelId}/rooms`, { params: floor != null ? { floor } : {} }),
  bulkCreateRooms: (hostelId, data) => api.post(`/hostel/buildings/${hostelId}/rooms/bulk`, data),

  // Warden/Admin — Templates
  getTemplates: () => api.get('/hostel/templates'),
  createTemplate: (data) => api.post('/hostel/templates', data),

  // Warden/Admin — Beds
  getBedGrid: (roomId) => api.get(`/hostel/rooms/${roomId}/grid`),
  togglePremium: (roomId, bedId, data) => api.patch(`/hostel/rooms/${roomId}/beds/${bedId}/toggle-premium`, data),
  setBedStatus: (roomId, bedId, data) => api.patch(`/hostel/rooms/${roomId}/beds/${bedId}/status`, data),

  // Warden — Gatepasses
  getPendingGatepasses: (hostelId) => api.get('/hostel/gatepasses/pending', { params: { hostel_id: hostelId } }),
  reviewGatepass: (id, data) => api.put(`/hostel/gatepasses/${id}/review`, data),

  // Warden Dashboard
  wardenDashboard: () => api.get('/hostel/warden/dashboard'),
};

// Transport Management — Bus Tracking & Enrollment
export const transportAPI = {
  // Student
  routes: () => api.get('/transport/routes'),
  enroll: (data) => api.post('/transport/enroll', data),
  myEnrollment: () => api.get('/transport/my-enrollment'),
  liveStatus: (routeId) => api.get(`/transport/live/${routeId}`),
  busStatus: (routeId) => api.get(`/transport/status/${routeId}`),
  busPass: () => api.get('/transport/pass'),
  tripHistory: () => api.get('/transport/history'),

  // Admin — Fleet
  adminRoutes: () => api.get('/admin/transport/routes'),
  createRoute: (data) => api.post('/admin/transport/routes', data),
  updateRoute: (id, data) => api.put(`/admin/transport/routes/${id}`, data),
  assignDriver: (data) => api.post('/admin/transport/assign-driver', data),
  dashboard: () => api.get('/admin/transport/dashboard'),
  trips: (params) => api.get('/admin/transport/trips', { params }),

  // Admin — Trip Control
  startTrip: (data) => api.post('/admin/transport/start-trip', data),
  endTrip: (data) => api.post('/admin/transport/end-trip', data),
  clearStop: (data) => api.post('/admin/transport/clear-stop', data),
  scanBoarding: (data) => api.post('/admin/transport/scan-boarding', data),

  // Admin — Devices
  devices: () => api.get('/admin/transport/devices'),
  registerDevice: (data) => api.post('/admin/transport/devices', data),

  // Simulator
  simStart: (data) => api.post('/transport/simulate/start', data),
  simAdvance: (data) => api.post('/transport/simulate/advance', data),
  simEnd: (data) => api.post('/transport/simulate/end', data),
};

// Library Management
export const libraryAPI = {
  // Search & Detail
  search: (q, params = {}) => api.get('/library/search', { params: { q, ...params } }),
  bookDetail: (id) => api.get(`/library/books/${id}`),

  // Catalog (Librarian/Admin)
  addBook: (data) => api.post('/library/books', data),
  updateBook: (id, data) => api.put(`/library/books/${id}`, data),
  addCopies: (bookId, copies) => api.post(`/library/books/${bookId}/copies`, { copies }),

  // Checkout / Return
  checkout: (data) => api.post('/library/checkout', data),
  returnBook: (data) => api.post('/library/return', data),
  renew: (data) => api.post('/library/renew', data),
  kioskScan: (data) => api.post('/library/kiosk/scan', data),

  // Reservations
  reserve: (bookId) => api.post('/library/reserve', { book_id: bookId }),
  myAccount: () => api.get('/library/my-account'),

  // Fines
  payFine: (fineId, payVia) => api.post(`/library/fines/${fineId}/pay`, { fine_id: fineId, pay_via: payVia }),

  // Dashboard
  dashboard: () => api.get('/library/dashboard'),
};

// Visitor Management — Campus & Hostel Visitor Tracking
export const visitorAPI = {
  // Dashboard
  dashboard: (params = {}) => api.get('/visitors/dashboard', { params }),

  // Search
  search: (q) => api.get('/visitors/search', { params: { q } }),

  // Check-in / Check-out
  checkIn: (data) => api.post('/visitors/check-in', data),
  checkInPreApproved: (visitId, badgeNumber) => api.post(`/visitors/${visitId}/check-in`, null, { params: badgeNumber ? { badge_number: badgeNumber } : {} }),
  checkOut: (data) => api.post('/visitors/check-out', data),

  // Pre-approve
  preApprove: (data) => api.post('/visitors/pre-approve', data),

  // Approve / Reject
  review: (visitId, data) => api.put(`/visitors/${visitId}/review`, data),

  // Queries
  getActive: (params = {}) => api.get('/visitors/active', { params }),
  getPending: (params = {}) => api.get('/visitors/pending', { params }),
  getPreApproved: (params = {}) => api.get('/visitors/pre-approved', { params }),
  getMyExpected: () => api.get('/visitors/my-expected'),
  getLog: (params = {}) => api.get('/visitors/log', { params }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// INSIGHTS ENGINE v2 — Edge Function primary, Python backend fallback
// ═══════════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://axjhruxfwzymagaztney.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4amhydXhmd3p5bWFnYXp0bmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyOTk5MjIsImV4cCI6MjA5MDg3NTkyMn0.Vdd3tJDizUMTu66UfJmJtJYOT0d36cjbt3TAXAbE1O4';

async function queryEdgeFunction(data) {
  const token = authToken; // Use the in-memory token from api.js
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/insights-query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      message: data.message,
      college_id: data.active_college_id,
    }),
    signal: AbortSignal.timeout(150000),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(err.error || `Edge Function error ${resp.status}`);
  }
  const result = await resp.json();
  return {
    data: {
      columns: result.columns,
      data: result.data,
      row_count: result.row_count,
      summary: result.summary,
      chart_suggestion: result.chart_suggestion,
      source: result.source,
      timing: result.timing,
    }
  };
}

export const insightsAPI = {
  query: async (data) => {
    // Try Edge Function first, fall back to Python backend
    try {
      return await queryEdgeFunction(data);
    } catch (edgeErr) {
      console.warn('[InsightsAPI] Edge Function failed, falling back to Python:', edgeErr.message);
      return api.post('/insights/query', data, { timeout: 150000 });
    }
  },
  // Direct Edge Function call (no fallback)
  queryEdge: (data) => queryEdgeFunction(data),
  // Direct Python backend call (for testing)
  queryPython: (data) => api.post('/insights/query', data, { timeout: 150000 }),
  getPins: () => api.get('/insights/pins'),
  createPin: (data) => api.post('/insights/pins', data),
  deletePin: (id) => api.delete(`/insights/pins/${id}`),
};

// ═══════════════════════════════════════════════════════════════════════════════
// PRE-ENROLLMENT API HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export const preEnrollAPI = {
  requestOTP: (data) => api.post('/pre-enroll/hostel/request-otp', data),
  verifyOTP: (data) => api.post('/pre-enroll/hostel/verify-otp', data),
  
  getAvailableBuildings: (token) => api.get('/pre-enroll/hostel/available', {
    headers: { Authorization: `Bearer ${token}` }
  }),
  getBuildingFloors: (id, token) => api.get(`/pre-enroll/hostel/buildings/${id}/floors`, {
    headers: { Authorization: `Bearer ${token}` }
  }),
  getRoomGrid: (roomId, token) => api.get(`/pre-enroll/hostel/rooms/${roomId}/grid`, {
    headers: { Authorization: `Bearer ${token}` }
  }),
  lockBed: (bedId, token) => api.post('/pre-enroll/hostel/beds/lock', { bed_id: bedId }, {
    headers: { Authorization: `Bearer ${token}` }
  }),
  confirmBooking: (bedId, paymentRef, token) => api.post('/pre-enroll/hostel/beds/confirm', { bed_id: bedId, payment_reference: paymentRef }, {
    headers: { Authorization: `Bearer ${token}` }
  }),
  getMyAllocation: (token) => api.get('/pre-enroll/hostel/my-allocation', {
    headers: { Authorization: `Bearer ${token}` }
  })
};

// PLACEMENT PREP DEPTH API
export const placementPrepAPI = {
  aptitudeQuestions: (params) => api.get('/placement-prep/aptitude', { params }),
  companyPrep: (companyName) => api.get('/placement-prep/company', { params: { company_name: companyName } }),
  companyExperiences: (companyName) => api.get('/placement-prep/experiences', { params: { company_name: companyName } }),
  sqlProblems: (params) => api.get('/placement-prep/sql-problems', { params }),
  getSqlProblem: (id) => api.get(`/placement-prep/sql-problems/${id}`),
  logAptitudeAttempt: (data) => api.post('/placement-prep/aptitude/attempt', data),
  logSqlAttempt: (data) => api.post('/placement-prep/sql/attempt', data),
  executeSqlBackend: (data) => api.post('/placement-prep/sql/execute', data),
  getProgress: (studentId) => api.get(`/placement-prep/progress/${studentId}`),
};

// ACCREDITATION API (NAAC / NBA / NEP)
export const accreditationAPI = {
  getNAACSummary: (collegeId, academicYear) => api.get(`/accreditation/naac/summary/${collegeId}`, { params: { academic_year: academicYear } }),
  getNAACEvidence: (collegeId, criterionId) => api.get(`/accreditation/naac/evidence/${collegeId}/${criterionId}`),
  getNBAMatrix: (departmentId, academicYear) => api.get(`/accreditation/nba/attainment/${departmentId}`, { params: { academic_year: academicYear } }),
  getNBASuccessRate: (collegeId, batchYear) => api.get(`/accreditation/nba/success-rate/${collegeId}`, { params: { batch_year: batchYear } }),
  getNBAFacultyCadre: (collegeId) => api.get(`/accreditation/nba/faculty-cadre/${collegeId}`),
  getNEPStatus: (collegeId) => api.get(`/accreditation/nep/status/${collegeId}`),
  calculateCourseAttainment: (courseId, academicYear) => api.post(`/accreditation/calculate/course/${courseId}`, null, { params: { academic_year: academicYear } }),
  calculateDepartmentAttainment: (departmentId, academicYear) => api.post(`/accreditation/calculate/department/${departmentId}`, null, { params: { academic_year: academicYear } }),
  generateReport: (payload) => api.post('/accreditation/reports/generate', payload),
  getReportStatus: (jobId) => api.get(`/accreditation/reports/status/${jobId}`),
};
