import axiosClient from '../config/axiosClient';

const adminService = {
  // User Management
  // Thêm params để Spring Boot 3.x không nhầm route vào ResourceHttpRequestHandler
  // Bug: @GetMapping no-path bị static resource handler intercept khi không có query string
  getAllUsers: () => axiosClient.get('/admin/users/all', { params: { _t: Date.now() } }),
  toggleUserStatus: (id) => axiosClient.put(`/admin/users/${id}/status`),
  promoteToAdmin: (id) => axiosClient.put(`/admin/users/${id}/promote`),
  deleteUser: (id) => axiosClient.delete(`/admin/users/${id}`),

  // KYC Management
  getPendingKycUsers: () => axiosClient.get('/admin/users/kyc/pending'),
  approveKyc: (id) => axiosClient.put(`/admin/users/${id}/kyc/approve`),
  rejectKyc: (id, reason) => axiosClient.put(`/admin/users/${id}/kyc/reject?reason=${encodeURIComponent(reason)}`),

  // Dashboard Stats - gọi các API thực tế
  getDashboardStats: () => axiosClient.get('/admin/properties', { params: { page: 0, size: 1 } }),
  getAllPropertiesStat: (status) => axiosClient.get('/admin/properties', { params: { status, page: 0, size: 1 } }),
  getMonthlyTransactions: () => axiosClient.get('/api/transactions/all'),

  // Room Management (Đã cấu hình chuẩn theo AdminPropertyController của Backend)
  getPendingRooms: () => axiosClient.get('/admin/properties', {
    params: {
      status: 'PENDING',
      page: 0,
      size: 100 // Lấy tối đa 100 tin đang chờ duyệt
    }
  }),
  approveRoom: (id, approved, reason = null) => {
    // Gọi PatchMapping("/{id}/status")
    // Trạng thái chuẩn phải là ACTIVE (Đang hiển thị) chứ không phải APPROVED
    const status = approved ? 'ACTIVE' : 'REJECTED';
    return axiosClient.patch(`/admin/properties/${id}/status`, null, {
      params: { status }
    });
  },

  // User CRUD (mock - cần backend)
  createUser: (data) => axiosClient.post('/admin/users', data),
  updateUser: (id, data) => axiosClient.put(`/admin/users/${id}`, data),

  // --- Quản lý Tin Đăng & Thùng Rác ---
  getAllProperties: (page = 0, size = 10, status) => axiosClient.get('/admin/properties', {
    params: { page, size, status }
  }),
  softDeleteProperty: (id) => axiosClient.delete(`/admin/properties/${id}`),
  getTrashProperties: (page = 0, size = 10) => axiosClient.get('/admin/properties/trash', {
    params: { page, size }
  }),
  restoreProperty: (id) => axiosClient.put(`/admin/properties/${id}/restore`),
  hardDeleteProperty: (id) => axiosClient.delete(`/admin/properties/${id}/force`),

  // --- Quản lý Dự Án ---
  getAllProjects: (page = 0, size = 10) => axiosClient.get('/admin/projects', { params: { page, size } }),
  getProjectDetail: (id) => axiosClient.get(`/admin/projects/${id}`),
  createProject: (data) => axiosClient.post('/admin/projects', data),
  updateProject: (id, data) => axiosClient.put(`/admin/projects/${id}`, data),
  softDeleteProject: (id) => axiosClient.delete(`/admin/projects/${id}`),
  getTrashProjects: (page = 0, size = 10) => axiosClient.get('/admin/projects/trash', { params: { page, size } }),
  restoreProject: (id) => axiosClient.put(`/admin/projects/${id}/restore`),
  hardDeleteProject: (id) => axiosClient.delete(`/admin/projects/${id}/force`),

  // ===== Service Package CRUD (AdminServicePackageController - /api/admin/packages) =====
  // 🟢 GET: ADMIN + OWNER đều có quyền xem (hasAnyRole)
  getAllServicePackages: () => axiosClient.get('/api/admin/packages'),

  // 🔴 POST/PUT/DELETE: Chỉ ADMIN
  createServicePackage: (data) => axiosClient.post('/api/admin/packages', data),
  updateServicePackage: (id, data) => axiosClient.put(`/api/admin/packages/${id}`, data),
  deleteServicePackage: (id) => axiosClient.delete(`/api/admin/packages/${id}`),
};

export default adminService;