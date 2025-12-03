// client/src/api/messagesApi.js
import axios from "./axiosInstance";

/**
 * fetchMessages(channelId, { limit=30, before=null })
 * - before: messageId or ISO date string
 */
export const fetchMessages = (channelId, { limit = 30, before = null } = {}) => {
  const params = { channelId, limit };
  if (before) params.before = before;
  return axios.get("/messages", { params }).then((r) => r.data);
};
