
import axios from "./axiosInstance";

export const fetchMessages = (channelId, { limit = 30, before = null } = {}) => {
  const params = { channelId, limit };
  if (before) params.before = before;
  return axios.get("/messages", { params }).then((r) => r.data);
};
