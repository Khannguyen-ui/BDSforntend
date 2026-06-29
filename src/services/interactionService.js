import axiosClient from '../config/axiosClient';

const getGuestId = () => {
  let guestId = localStorage.getItem('guestId');

  if (!guestId || String(guestId).startsWith('guest_')) {
    guestId = Date.now().toString();
    localStorage.setItem('guestId', guestId);
  }

  return guestId;
};

const getHeaders = () => {
  return {
    'X-Guest-Id': getGuestId(),
  };
};

const interactionService = {
  likeProperty: (propertyId) => {
    return axiosClient.post(
      `/properties/${propertyId}/like`,
      null,
      { headers: getHeaders() }
    );
  },

  saveProperty: (propertyId) => {
    return axiosClient.post(
      `/properties/${propertyId}/save`,
      null,
      { headers: getHeaders() }
    );
  },

  trackView: (propertyId) => {
    return axiosClient.post(
      `/properties/${propertyId}/view`,
      null,
      { headers: getHeaders() }
    );
  },

  trackClick: (propertyId, source) => {
    return axiosClient.post(
        `/properties/${propertyId}/click`,
        {
            source,
        },
        {
            headers: getHeaders(),
        }
    );
},

  shareProperty: (propertyId) => {
    return axiosClient.post(
      `/properties/${propertyId}/share`,
      null,
      { headers: getHeaders() }
    );
  },

  getLikedProperties: (page = 0, size = 10) => {
    return axiosClient.get('/properties/me/liked', {
      params: { page, size },
      headers: getHeaders(),
    });
  },

  getSavedProperties: (page = 0, size = 10) => {
    return axiosClient.get('/properties/me/saved', {
      params: { page, size },
      headers: getHeaders(),
    });
  },
};

export default interactionService;