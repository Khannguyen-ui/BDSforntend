import axiosClient from '../config/axiosClient';

const normalizeNumber = (value, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const getRecommendUserId = () => {
  const userSessionId = sessionStorage.getItem('userSessionId');

  if (userSessionId) {
    const sessionUserId = sessionStorage.getItem(`${userSessionId}_userId`);
    if (sessionUserId && !Number.isNaN(Number(sessionUserId))) {
      return Number(sessionUserId);
    }
  }

  let guestId = localStorage.getItem('guestId');

  if (!guestId || Number.isNaN(Number(guestId))) {
    guestId = Date.now().toString();
    localStorage.setItem('guestId', guestId);
  }

  return Number(guestId);
};

const normalizeLocationMetadata = (metadata = {}) => {
  const province = metadata.province || '';
  const ward = metadata.ward || '';

  return {
    province,
    ward,
    district: ward ? '' : (metadata.district || '')
  };
};

const recommendService = {
  trackBehavior: async (itemId, itemType, action, metadata = {}) => {
    const location = normalizeLocationMetadata(metadata);

    try {
      return await axiosClient.post('/recommend/track', {
        itemId: normalizeNumber(itemId),
        itemType: itemType || 'PROPERTY',
        action: action || 'VIEW',
        userId: getRecommendUserId(),
        duration: normalizeNumber(metadata.duration, 1.0),
        watchTime: normalizeNumber(metadata.watchTime, 0.0),
        price: normalizeNumber(metadata.price, 0.0),
        userBudget: normalizeNumber(metadata.userBudget, 0.0),
        locationMatch: normalizeNumber(metadata.locationMatch, 0),
        categoryMatch: normalizeNumber(metadata.categoryMatch, 0),
        province: location.province,
        ward: location.ward,
        district: location.district
      });
    } catch (error) {
      console.warn('[recommend track ignored]', error.response?.status, error.response?.data || error.message);
      return null;
    }
  },

  trackSearch: async (data = {}) => {
    const location = normalizeLocationMetadata(data);

    try {
      return await axiosClient.post('/recommend/search/track', {
        userId: getRecommendUserId(),
        keyword: data.keyword || '',
        province: location.province,
        ward: location.ward,
        district: location.district,
        minPrice: normalizeNumber(data.minPrice, 0),
        maxPrice: normalizeNumber(data.maxPrice, 0)
      });
    } catch (error) {
      console.warn('[recommend search track ignored]', error.response?.status, error.response?.data || error.message);
      return null;
    }
  },

  getSearchSuggestions: async (keyword) => {
    return axiosClient.get('/recommend/search/suggest', { params: { keyword } });
  },

  getTopSearches: async () => {
    return axiosClient.get('/recommend/search/top');
  },

  getFinalPropertiesFeed: async (userId, page = 0, size = 10, propertyType) => {
    const params = { page, size };
    if (propertyType && propertyType !== 'ALL') {
      params.propertyType = propertyType;
    }

    return axiosClient.get(`/recommend/users/${normalizeNumber(userId)}/properties/final`, {
      params
    });
  },

  getFinalReelsFeed: async (userId, page = 0, size = 10) => {
    return axiosClient.get(`/recommend/users/${normalizeNumber(userId)}/reels/final`, {
      params: { page, size }
    });
  },

  getDashboard: async () => {
    return axiosClient.get('/recommend/analytics/dashboard');
  },

  getTrendingProperties: async (limit = 10) => {
    return axiosClient.get('/recommend/analytics/trending/properties', { params: { limit } });
  },

  getTrendingReels: async (limit = 10) => {
    return axiosClient.get('/recommend/analytics/trending/reels', { params: { limit } });
  },

  getRankingConfig: async () => {
    return axiosClient.get('/recommend/admin/ranking-config');
  },

  updateRankingConfig: async (config) => {
    return axiosClient.put('/recommend/admin/ranking-config', config);
  },

  getInterestProfile: async (userId) => {
    return axiosClient.get(`/recommend/users/${normalizeNumber(userId)}/interest-profile`);
  },

  checkFraudStatus: async (userId) => {
    return axiosClient.get(`/recommend/fraud/users/${normalizeNumber(userId)}`);
  }
};

export default recommendService;