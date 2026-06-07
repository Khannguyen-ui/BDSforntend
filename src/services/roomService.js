import axiosClient from "../config/axiosClient";
import { getGuestId } from "../utils/guestId";

const roomService = {
  // 1. Lấy danh sách phòng của chủ trọ (ưu tiên API owner/me, fallback về public)
  getMyRooms: async (ownerId) => {
    // Thử API owner (yêu cầu auth) trước - trả về đầy đủ likeCount, viewCount, saveCount
    try {
      const res = await axiosClient.get('/properties', { params: { page: 0, size: 200 } });
      const resultObj = res.data?.result || res.data?.data || res.data;
      const contentArray = Array.isArray(resultObj) ? resultObj : (resultObj?.content || []);
      if (contentArray.length >= 0) return { data: contentArray };
    } catch (_) {
      // nếu lỗi 403/404 thì fallback
    }

    // Fallback: gọi API public với ownerId
    let targetId = ownerId;
    if (!targetId) {
      const userSessionId = sessionStorage.getItem('userSessionId');
      if (userSessionId) {
        targetId = sessionStorage.getItem(`${userSessionId}_userId`);
      }
    }
    if (!targetId) {
      console.warn("getMyRooms called without ownerId and no active user session found.");
      return { data: [] };
    }
    const res = await axiosClient.get(`/public/properties/owners/${targetId}`, {
      params: { page: 0, size: 200 }
    });
    const resultObj = res.data?.result || res.data?.data || res.data;
    const contentArray = Array.isArray(resultObj) ? resultObj : (resultObj?.content || []);
    return { data: contentArray };
  },

  // Theo dõi lượt xem khi user vào xem chi tiết bài
  trackView: async (propertyId) => {
    try {
      await axiosClient.get(`/public/properties/${propertyId}`);
    } catch (_) {
      // Silent fail - không làm phần UI bị hỏng
    }
  },

  // 2. CRUD cơ bản
  createRoom: (data) => axiosClient.post('/properties', data),
  deleteRoom: (id) => axiosClient.delete(`/properties/${id}`),
  updateRoom: (id, data) => axiosClient.put(`/properties/${id}`, data),
  getMyTrash: (page = 0, size = 10) => axiosClient.get('/properties/trash', { params: { page, size } }),
  restoreRoom: (id) => axiosClient.put(`/properties/${id}/restore`),
  hardDeleteRoom: (id) => axiosClient.delete(`/properties/${id}/force`),

  getVideoRooms: async (params) => {
    // Lấy session để kiểm tra đã login chưa
    const userSessionId = sessionStorage.getItem('userSessionId');
    const token = userSessionId ? sessionStorage.getItem(`${userSessionId}_accessToken`) : null;

    const headers = {};
    // Nếu chưa login thì gửi X-Guest-Id để backend biết khách nào
    if (!token) {
      headers['X-Guest-Id'] = getGuestId();
    }

    const res = await axiosClient.get('/public/properties/reels', {
      params: {
        cursor: params?.cursor || undefined,
        size: params?.size || 10
      },
      headers
    });
    return { data: res.data?.result || res.data };
  },

  // 4. Upload media
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return axiosClient.post('/media/api/v1/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // 5. Master data
  getAllAmenities: () => axiosClient.get('/amenities'),
  getAllPackages: () => axiosClient.get('/api/admin/packages/active'),
  getPublicProjects: () => axiosClient.get('/public/projects', { params: { page: 0, size: 100 } }),

  // 6. Chi tiết phòng (Handle ApiResponse)
  getRoomById: async (id) => {
    const res = await axiosClient.get(`/public/properties/${id}`);
    //console.log('🏠 getRoomById raw response:', res.data);
    const data = res.data?.result || res.data;
    //console.log('🏠 getRoomById extracted data:', data);
    return { data };
  },

  // 🟢 7. TÌM KIẾM NÂNG CAO - ✅ KHÔNG LỌC TEST DATA NỮA!
  searchRooms: async (params) => {
    // 1. Trích xuất chính xác các giá trị từ UI gửi lên (hỗ trợ cả key cũ và mới)
    const page = params?.page || 0;
    const size = params?.size || 20;
    const keyword = params?.keyword || undefined;
    const latitude = params?.latitude || params?.lat || undefined;
    const longitude = params?.longitude || params?.lng || undefined;
    const radiusKm = params?.radiusKm || (params?.radius ? Math.round(params.radius / 1000) : undefined);

    let propertyTypes = undefined;
    const inputType = params?.propertyTypes || params?.propertyType || params?.type;
    if (inputType && inputType !== 'ALL') {
      propertyTypes = inputType;
    }

    const transactionTypes = (params?.transactionTypes === 'ALL' || params?.transactionType === 'ALL') ? undefined : (params?.transactionTypes || params?.transactionType || 'FOR_RENT');
    const minPrice = params?.minPrice || undefined;
    const maxPrice = params?.maxPrice || undefined;
    const minArea = params?.minArea || undefined;
    const maxArea = params?.maxArea || undefined;
    const minBedrooms = params?.minBedrooms || params?.bedrooms || undefined;
    const minBathrooms = params?.minBathrooms || params?.bathrooms || undefined;

    // Các tham số Lọc Nâng Cao (Mới thêm)
    const amenities = Array.isArray(params?.amenities) ? params.amenities.join(',') : params?.amenities;
    const furnishingStatuses = Array.isArray(params?.furnishingStatuses) ? params.furnishingStatuses.join(',') : (params?.furnishingStatuses || params?.furniture || undefined);
    const projectId = params?.projectId || undefined;
    const hasBalcony = params?.hasBalcony !== undefined ? params.hasBalcony : undefined;
    const province = params?.province || undefined;
    const ward = params?.ward || undefined;

    const district = ward ? undefined : (params?.district || undefined);

    const searchApiParams = {
      page,
      size,
      keyword,
      latitude,
      longitude,
      radiusKm,
      province,
      district,
      ward,
      propertyTypes,
      transactionTypes,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      minBedrooms,
      minBathrooms,
      amenities,
      furnishingStatuses,
      projectId,
      hasBalcony,
      sortBy: params?.sortBy,
      sortDir: params?.sortDir
    };

    // Giữ object validParams cho logic fallback client-side bên dưới nếu cần dùng
    const validParams = { ...params, page, size };

    try {
      // GỌI TRỰC TIẾP ELASTICSEARCH API THEO SPEC VỚI THAM SỐ CHUẨN SẠCH
      const res = await axiosClient.get('/search/properties', { params: searchApiParams });

      const resultData = res.data?.result || res.data?.data || res.data;

      // Dữ liệu trả về (có thể rỗng nếu không có bài viết nào khớp với bộ lọc)
      const content = Array.isArray(resultData) ? resultData : (resultData?.content || []);
      // Không ném lỗi nếu content rỗng, vì đây là kết quả lọc hợp lệ

      return { data: resultData };
    } catch (error) {
      console.warn("Search Service fail or empty, using DB fallback:", error.message);
      try {
        // Fallback gọi thẳng vào DB thường do ElasticSearch có thể chưa đồng bộ
        const fallbackRes = await axiosClient.get('/public/properties', {
          params: { page: 0, size: 50 }
        });

        const fallbackData = fallbackRes.data?.result || fallbackRes.data?.data || fallbackRes.data;
        let content = fallbackData.content || [];

        // Sắp xếp lại để đưa tin đẩy/mới lên đầu
        content = [...content].sort((a, b) => {
          const priorityA = a.priorityLevel || (a.isPromoted ? 100 : 0);
          const priorityB = b.priorityLevel || (b.isPromoted ? 100 : 0);
          if (priorityA !== priorityB) {
            return priorityB - priorityA;
          }
          const dateA = new Date(a.lastPushedAt || a.promotionExpiresAt || a.createdAt);
          const dateB = new Date(b.lastPushedAt || b.promotionExpiresAt || b.createdAt);
          return dateB - dateA;
        });

        // Phân trang lại trên Client-side
        const page = validParams.page || 0;
        const size = validParams.size || 20;
        const pagedContent = content.slice(page * size, (page + 1) * size);

        return {
          data: {
            content: pagedContent,
            totalElements: content.length,
            totalPages: Math.ceil(content.length / size),
            number: page
          }
        };
      } catch (fallbackError) {
        return {
          data: {
            content: [],
            totalElements: 0,
            totalPages: 0,
            number: 0
          }
        };
      }
    }
  },

  // 8. Các API khác
  searchNearby: async (lat, lng, radius = 10000) => {
    const res = await axiosClient.get("/public/properties", {
      params: { page: 0, size: 20, lat, lng, radius }
    });
    return { data: res.data?.result || res.data };
  },

  getRoomsByLandlord: (landlordId, page = 0, size = 8, transactionType = null) => {
    const params = { page, size };
    if (transactionType) params.transactionType = transactionType;
    return axiosClient.get(`/public/properties/owners/${landlordId}`, { params });
  },

  // Analytics
  getPriceTrends: (params) => axiosClient.get(`/api/v1/analytics/price-trends`, { params }),
  getPricesByWards: (params) => axiosClient.get(`/api/v1/analytics/ward-prices`, { params }),
  getTopRegionsTransactionStats: (limit = 5, regionField = 'province.keyword') => {
    return axiosClient.get(`/api/v1/analytics/top-regions`, { params: { limit, regionField } });
  },

  // Package & Promotion
  upgradeRoomPackage: (roomId, packageId) => {
    return axiosClient.post(`/properties/${roomId}/upgrade`, { servicePackageId: packageId });
  },
  purchasePackage: (packageId) => axiosClient.post('/transactions/purchase-package', packageId),
  pushRoom: async (propertyId, packageId) => {
    // Đổi chữ 'axios' thành 'axiosClient' (hoặc 'api' tùy dự án của bạn)
    return await axiosClient.post('/api/packages/buy-promotion', null, {
      params: {
        propertyId: propertyId,
        packageId: packageId
      }
    });
  },

  buyMembership: (packageId) => {
    return axiosClient.post('/api/packages/buy-membership', null, {
      params: { packageId }
    });
  },

  updateRoomStatus: (roomId, status) => {
    return axiosClient.put(`/properties/${roomId}/status`, null, { params: { status } });
  },

  toggleAutoRenew: (roomId, enable) => {
    return axiosClient.put(`/properties/${roomId}/auto-renew`, null, { params: { enable } });
  }
};

export default roomService;