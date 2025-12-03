import axios from "./axiosInstance";
export const signup = (payload) => axios.post("/auth/signup", payload).then((r) => r.data);
export const login = (payload) => axios.post("/auth/login", payload).then((r) => r.data);
export const me = () => axios.get("/auth/me").then((r) => r.data);
export const fetchChannels = (params) => axios.get("/channels", { params }).then((r) => r.data);
export const createChannel = (data) => axios.post("/channels", data).then((r) => r.data);
export const fetchMessages = (params) => axios.get("/messages", { params }).then((r) => r.data);
export const postMessage = (data) => axios.post("/messages", data).then((r) => r.data);
export const editMessage = (id, data) => axios.patch(`/messages/${id}`, data).then((r) => r.data);
export const deleteMessage = (id) => axios.delete(`/messages/${id}`).then((r) => r.data);
export const leaveChannelApi = (channelId) => axios.post(`/channels/${channelId}/leave`).then((r) => r.data);
export const deleteChannelApi = (channelId) => axios.delete(`/channels/${channelId}`).then((r) => r.data);
export const searchChannelsApi = (q) => axios.get(`/channels/search`, { params: { q } }).then((r) => r.data);
export const requestJoinChannelApi = (channelId) => axios.post(`/channels/${channelId}/join-request`).then((r) => r.data);
export const approveJoinRequestApi = (channelId, userId) => axios.post(`/channels/${channelId}/approve-request`, { userId }).then((r) => r.data);
export const rejectJoinRequestApi = (channelId, userId) => axios.post(`/channels/${channelId}/reject-request`, { userId }).then((r) => r.data);

