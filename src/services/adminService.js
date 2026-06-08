import axiosClient from '../config/axiosClient';

const adminService = {
  getAllUsers: () =>
    axiosClient.get('/admin/users/all', {
      params: { _t: Date.now() }
    }),

  toggleUserStatus: (id) =>
    axiosClient.put(`/admin/users/${id}/status`),

  promoteToAdmin: (id) =>
    axiosClient.put(`/admin/users/${id}/promote`),

  deleteUser: (id) =>
    axiosClient.delete(`/admin/users/${id}`),

  getPendingKycUsers: () =>
    axiosClient.get('/admin/users/kyc/pending'),

  approveKyc: (id) =>
    axiosClient.put(`/admin/users/${id}/kyc/approve`),

  rejectKyc: (id, reason) =>
    axiosClient.put(`/admin/users/${id}/kyc/reject`, null, {
      params: { reason }
    }),

  getUserProperties: (userId) =>
    axiosClient.get('/admin/properties', {
      params: {
        ownerId: userId,
        page: 0,
        size: 100
      }
    }),
  getUserQuota: (userId) => {
    return axiosClient.get(`/admin/properties/users/${userId}/quota`);
  },

  getUserTransactions: (userId) =>
    axiosClient.get(`/api/transactions/my-history/${userId}`),

  getUserSubscriptions: (userId) =>
    axiosClient.get(`/api/transactions/admin/users/${userId}/subscriptions`),

  getDashboardStats: () =>
    axiosClient.get('/admin/properties', {
      params: { page: 0, size: 1, _t: Date.now() }
    }),

  getAllPropertiesStat: (status) =>
    axiosClient.get('/admin/properties', {
      params: { status, page: 0, size: 1, _t: Date.now() }
    }),

  getMonthlyTransactions: () =>
    axiosClient.get('/api/transactions/all'),

  getPendingRooms: () =>
    axiosClient.get('/admin/properties', {
      params: {
        status: 'PENDING',
        page: 0,
        size: 100,
        _t: Date.now()
      }
    }),

  getAdminProperties: (params = {}) =>
    axiosClient.get('/admin/properties', {
      params: {
        page: 0,
        size: 100,
        ...params
      }
    }),

  approveRoom: (id, approved) => {
    const status = approved ? 'ACTIVE' : 'REJECTED';
    return axiosClient.patch(`/admin/properties/${id}/status`, null, {
      params: { status }
    });
  },

  getAllProperties: (page = 0, size = 10, status) =>
    axiosClient.get('/admin/properties', {
      params: { page, size, status }
    }),

  softDeleteProperty: (id) =>
    axiosClient.delete(`/admin/properties/${id}`),

  getTrashProperties: (page = 0, size = 10) =>
    axiosClient.get('/admin/properties/trash', {
      params: { page, size }
    }),

  restoreProperty: (id) =>
    axiosClient.put(`/admin/properties/${id}/restore`),

  hardDeleteProperty: (id) =>
    axiosClient.delete(`/admin/properties/${id}/force`),

  getAllProjects: (page = 0, size = 10) =>
    axiosClient.get('/admin/projects', {
      params: { page, size }
    }),

  getProjectDetail: (id) =>
    axiosClient.get(`/admin/projects/${id}`),

  createProject: (data) =>
    axiosClient.post('/admin/projects', data),

  updateProject: (id, data) =>
    axiosClient.put(`/admin/projects/${id}`, data),

  softDeleteProject: (id) =>
    axiosClient.delete(`/admin/projects/${id}`),

  getTrashProjects: (page = 0, size = 10) =>
    axiosClient.get('/admin/projects/trash', {
      params: { page, size }
    }),

  restoreProject: (id) =>
    axiosClient.put(`/admin/projects/${id}/restore`),

  hardDeleteProject: (id) =>
    axiosClient.delete(`/admin/projects/${id}/force`),

  getAllServicePackages: () =>
    axiosClient.get('/api/admin/packages'),

  createServicePackage: (data) =>
    axiosClient.post('/api/admin/packages', data),

  updateServicePackage: (id, data) =>
    axiosClient.put(`/api/admin/packages/${id}`, data),

  deleteServicePackage: (id) =>
    axiosClient.delete(`/api/admin/packages/${id}`),
};

export default adminService;