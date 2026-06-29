import axiosClient from "../config/axiosClient";

const ownerFollowService = {
  toggleFollow: (ownerId) =>
    axiosClient.post(`/owners/${ownerId}/follow`),

  isFollowing: (ownerId) =>
    axiosClient.get(`/owners/${ownerId}/is-following`),

  countFollowers: (ownerId) =>
    axiosClient.get(`/owners/${ownerId}/followers/count`),

  getFollowingOwners: (userId) =>
    axiosClient.get(`/owners/following/${userId}`),
};

export default ownerFollowService;