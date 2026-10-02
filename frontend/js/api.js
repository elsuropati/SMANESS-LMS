import { getState, setState } from './state.js';

export async function apiRequest(endpoint, options = {}) {
  const state = getState();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      if (state.token) {
        localStorage.removeItem('ai_classroom_token');
        setState({ token: null, user: null, dashboardData: null });
        window.location.hash = '#login';
      }
      throw new Error(data.message || 'Sesi telah berakhir. Silakan login kembali.');
    }

    if (!res.ok) {
      throw new Error(data.message || `Terjadi kesalahan (Kode: ${res.status})`);
    }

    return data;
  } catch (err) {
    throw err;
  }
}

export const api = {
  // Admin Methods
  getAdminStats: () => apiRequest('/api/admin/stats'),
  getAdminTeachers: () => apiRequest('/api/admin/teachers'),
  createTeacherByAdmin: (data) => apiRequest('/api/admin/teachers', { method: 'POST', body: JSON.stringify(data) }),
  toggleTeacherStatusByAdmin: (id, status) => apiRequest(`/api/admin/teachers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  resetTeacherPasswordByAdmin: (id) => apiRequest(`/api/admin/teachers/${id}/reset-password`, { method: 'POST' }),
  deleteTeacherByAdmin: (id) => apiRequest(`/api/admin/teachers/${id}`, { method: 'DELETE' }),

  // Auth
  login: (email, password) => apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  getMe: () => apiRequest('/api/auth/me'),
  logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),
  
  // Dashboard
  getTeacherDashboard: () => apiRequest('/api/dashboard/teacher'),
  getStudentDashboard: () => apiRequest('/api/dashboard/student'),

  // Classes & Students
  getClasses: () => apiRequest('/api/classes'),
  createClass: (data) => apiRequest('/api/classes', { method: 'POST', body: JSON.stringify(data) }),
  deleteClass: (classId) => apiRequest(`/api/classes/${classId}`, { method: 'DELETE' }),
  getStudents: (classId) => apiRequest(`/api/classes/${classId}/students`),
  createStudent: (classId, data) => apiRequest(`/api/classes/${classId}/students`, { method: 'POST', body: JSON.stringify(data) }),
  importStudents: (classId, students) => apiRequest(`/api/classes/${classId}/students/import`, { method: 'POST', body: JSON.stringify({ students }) }),
  toggleStudentStatus: (studentId, status) => apiRequest(`/api/classes/students/${studentId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  resetStudentPassword: (studentId) => apiRequest(`/api/classes/students/${studentId}/reset-password`, { method: 'POST' }),
  deleteStudent: (studentId) => apiRequest(`/api/classes/students/${studentId}`, { method: 'DELETE' }),

  // LKPD
  getLkpdList: () => apiRequest('/api/lkpd'),
  getLkpdById: (id) => apiRequest(`/api/lkpd/${id}`),
  createLkpd: (data) => apiRequest('/api/lkpd', { method: 'POST', body: JSON.stringify(data) }),
  updateLkpd: (id, data) => apiRequest(`/api/lkpd/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  duplicateLkpd: (id) => apiRequest(`/api/lkpd/${id}/duplicate`, { method: 'POST' }),
  deleteLkpd: (id) => apiRequest(`/api/lkpd/${id}`, { method: 'DELETE' }),

  // Assignments
  getAssignments: () => apiRequest('/api/assignments'),
  getAssignmentDetails: (id) => apiRequest(`/api/assignments/${id}`),
  createAssignment: (data) => apiRequest('/api/assignments', { method: 'POST', body: JSON.stringify(data) }),

  // Submissions
  getSubmissions: (assignmentId = '', classId = '') => {
    const params = new URLSearchParams();
    if (assignmentId) params.append('assignment_id', assignmentId);
    if (classId) params.append('class_id', classId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/api/submissions${qs}`);
  },
  saveStudentDraft: (assignment_id, answers) => apiRequest('/api/submissions/save-draft', { method: 'POST', body: JSON.stringify({ assignment_id, answers }) }),
  submitAssignment: (assignment_id, answers) => apiRequest('/api/submissions/submit', { method: 'POST', body: JSON.stringify({ assignment_id, answers }) }),

  // Grading
  submitGrade: (submissionId, data) => apiRequest(`/api/grades/${submissionId}`, { method: 'POST', body: JSON.stringify(data) }),
  getStudentResults: () => apiRequest('/api/grades/student-results'),

  // Followups
  getFollowups: () => apiRequest('/api/followups'),
  createFollowup: (data) => apiRequest('/api/followups', { method: 'POST', body: JSON.stringify(data) }),
  updateFollowupProgress: (id, progress) => apiRequest(`/api/followups/${id}/progress`, { method: 'PATCH', body: JSON.stringify({ progress }) }),

  // AI Services
  testAiConnection: (config) => apiRequest('/api/ai/test', { method: 'POST', body: JSON.stringify(config || {}) }),
  generateLkpd: (data) => apiRequest('/api/ai/generate-lkpd', { method: 'POST', body: JSON.stringify(data) }),
  evaluateSubmission: (data) => apiRequest('/api/ai/evaluate', { method: 'POST', body: JSON.stringify(data) }),
  sendAiChat: (data) => apiRequest('/api/ai/chat', { method: 'POST', body: JSON.stringify(data) }),
  getAiConfig: () => apiRequest('/api/ai/config'),
  saveAiConfig: (config) => apiRequest('/api/ai/config', { method: 'POST', body: JSON.stringify(config) }),

  exportGradesExcel: async (classId = '') => {
    const state = getState();
    const headers = {};
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
    const query = classId ? `?class_id=${encodeURIComponent(classId)}` : '';
    const res = await fetch(`/api/grades/export-excel${query}`, { headers });
    if (!res.ok) throw new Error('Gagal mengunduh file rekap nilai.');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Nilai_${classId ? 'Kelas' : 'Semua'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  // Reports
  getClassAnalytics: () => apiRequest('/api/reports/class-analytics')
};
