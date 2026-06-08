import axiosClient from "../config/axiosClient";
import { getGuestId } from "../utils/guestId";
import recommendService from "./recommendService";

const getInteractionHeaders = () => {
    const userSessionId = sessionStorage.getItem('userSessionId');
    const token = userSessionId ? sessionStorage.getItem(`${userSessionId}_accessToken`) : null;

    const headers = {};

    if (!token) {
        headers['X-Guest-Id'] = getGuestId();
    }

    return headers;
};

const favoriteService = {
    toggleLike: async (roomId, metadata = {}) => {
        recommendService
            .trackBehavior(roomId, metadata.itemType || 'PROPERTY', 'LIKE', metadata)
            .catch(e => console.warn(e));

        return axiosClient.post(`/properties/${roomId}/like`, null, {
            headers: getInteractionHeaders()
        });
    },

    toggleSave: async (roomId, metadata = {}) => {
        recommendService
            .trackBehavior(roomId, metadata.itemType || 'PROPERTY', 'SAVE', metadata)
            .catch(e => console.warn(e));

        return axiosClient.post(`/properties/${roomId}/save`, null, {
            headers: getInteractionHeaders()
        });
    },

    getMyLikedProperties: (page = 0, size = 10) => {
        return axiosClient.get('/properties/me/liked', {
            params: { page, size },
            headers: getInteractionHeaders()
        });
    },

    getMySavedProperties: (page = 0, size = 10) => {
        return axiosClient.get('/properties/me/saved', {
            params: { page, size },
            headers: getInteractionHeaders()
        });
    }
};

export default favoriteService;