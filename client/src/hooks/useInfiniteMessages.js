import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMessagesThunk, prependMessages } from "../redux/slices/messagesSlice";
import * as api from "../api/authApi";

export function useInfiniteMessages(channelId) {
  const dispatch = useDispatch();
  const state = useSelector((s) => s.messages.byChannel?.[String(channelId)]?.items || []);

  const fetchInitial = useCallback(
    (limit = 30) => {
      dispatch(fetchMessagesThunk({ channelId, limit }));
    },
    [channelId, dispatch]
  );

  const loadMore = useCallback(
    async (beforeMessageId, limit = 30) => {
      
      const res = await api.fetchMessages({ channelId, before: beforeMessageId, limit });
      if (res?.messages?.length) {
        dispatch(prependMessages({ channelId, messages: res.messages }));
      }
      return res?.messages?.length || 0;
    },
    [channelId, dispatch]
  );

  return { messages: state, fetchInitial, loadMore };
}
