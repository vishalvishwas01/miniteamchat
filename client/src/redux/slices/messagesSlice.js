// client/src/redux/slices/messagesSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchMessages as apiFetchMessages,
  postMessage,
  editMessage as apiEditMessage,
  deleteMessage as apiDeleteMessage,
} from "../../api/authApi";

// helper to keep legacy `list` key used by some components in sync with internal `items`
const _syncList = (chState) => {
  if (!chState) return;
  chState.list = chState.items;
};

/**
 * fetchMessagesThunk
 * params: { channelId, limit = 30, before = null }
 * - before: messageId or ISO timestamp to page before that point
 * Server returns messages in chronological order (oldest -> newest).
 */
export const fetchMessagesThunk = createAsyncThunk(
  "messages/fetch",
  async ({ channelId, limit = 30, before = null }, { rejectWithValue }) => {
    try {
      const res = await apiFetchMessages({ channelId, limit, before });
      // expect res.messages and res.hasMore
      return { channelId, messages: res.messages || [], hasMore: !!res.hasMore };
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);

// backward-compatible alias expected by components
export const loadMessagesThunk = fetchMessagesThunk;
export const postMessageThunk = createAsyncThunk(
  "messages/post",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await postMessage(payload);
      return res.message;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);

export const editMessageThunk = createAsyncThunk(
  "messages/edit",
  async ({ id, text }, { rejectWithValue }) => {
    try {
      const res = await apiEditMessage(id, { text });
      return res.message;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);

export const deleteMessageThunk = createAsyncThunk(
  "messages/delete",
  async (id, { rejectWithValue }) => {
    try {
      await apiDeleteMessage(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);

const slice = createSlice({
  name: "messages",
  initialState: {
    byChannel: {
      // [channelId]: { items: [], loading: false, hasMore: true }
    },
    status: "idle",
  },
  reducers: {
    // optimistic add: msg must include _id (clientId used as temp id) and channelId
    addOptimisticMessage(state, action) {
      const msg = action.payload;
      const channelId = String(msg.channelId || (msg.channelId?._id ?? ""));
      if (!channelId) return;
      if (!state.byChannel[channelId]) state.byChannel[channelId] = { items: [], loading: false, hasMore: true };
      const exists = state.byChannel[channelId].items.some((m) => String(m._id) === String(msg._id));
      if (!exists) state.byChannel[channelId].items.push(msg);
      _syncList(state.byChannel[channelId]);
    },

    // message received from socket (replace optimistic if clientId matches)
    receiveMessage(state, action) {
      const msg = action.payload;
      const channelId = msg.channelId?._id ? String(msg.channelId._id) : String(msg.channelId);
      if (!channelId) return;
      if (!state.byChannel[channelId]) state.byChannel[channelId] = { items: [], loading: false, hasMore: true };

      // If server message includes a clientId, find and replace optimistic message
      if (msg.clientId) {
        const tempIdx = state.byChannel[channelId].items.findIndex((m) => String(m._id) === String(msg.clientId));
        if (tempIdx !== -1) {
          // replace temp message with real one
          state.byChannel[channelId].items[tempIdx] = msg;
            _syncList(state.byChannel[channelId]);
          return;
        }
      }

      // dedupe by _id then push to end (newest)
      const exists = state.byChannel[channelId].items.some((m) => String(m._id) === String(msg._id));
      if (!exists) state.byChannel[channelId].items.push(msg);
      _syncList(state.byChannel[channelId]);
    },

    messageEdited(state, action) {
      const msg = action.payload;
      const channelId = String(msg.channelId);
      const ch = state.byChannel[channelId];
      if (!ch) return;
      const idx = ch.items.findIndex((m) => String(m._id) === String(msg._id));
      if (idx !== -1) ch.items[idx] = { ...ch.items[idx], ...msg };
      _syncList(ch);
    },

    messageDeleted(state, action) {
      const { messageId, channelId } = action.payload;
      const chKey = String(channelId);
      const ch = state.byChannel[chKey];
      if (!ch) return;
      // mark deleted flag if you prefer soft-delete, else remove:
      // ch.items = ch.items.filter(m => String(m._id) !== String(messageId));
      const idx = ch.items.findIndex((m) => String(m._id) === String(messageId));
      if (idx !== -1) ch.items.splice(idx, 1);
      _syncList(ch);
    },

    // prependMessages kept as helper if UI prefers explicit action
    prependMessages(state, action) {
      const { channelId, messages } = action.payload;
      const ch = String(channelId);
      if (!state.byChannel[ch]) state.byChannel[ch] = { items: [], loading: false, hasMore: true };
      // messages are expected oldest->newest; avoid duplicates
      const existingIds = new Set(state.byChannel[ch].items.map((m) => String(m._id)));
      const toAdd = messages.filter((m) => !existingIds.has(String(m._id)));
      state.byChannel[ch].items = [...toAdd, ...state.byChannel[ch].items];
      _syncList(state.byChannel[ch]);
    },

    clearChannel(state, action) {
      const ch = String(action.payload);
      delete state.byChannel[ch];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessagesThunk.pending, (state, action) => {
        const { channelId } = action.meta.arg || {};
        if (!channelId) return;
        const ch = String(channelId);
        state.byChannel[ch] = state.byChannel[ch] || { items: [], loading: false, hasMore: true };
        state.byChannel[ch].loading = true;
        _syncList(state.byChannel[ch]);
      })
      .addCase(fetchMessagesThunk.fulfilled, (state, action) => {
        const { channelId, messages, hasMore } = action.payload || {};
        if (!channelId) return;
        const ch = String(channelId);
        state.byChannel[ch] = state.byChannel[ch] || { items: [], loading: false, hasMore: true };

        // server returns messages oldest->newest. We want to prepend older pages when 'before' was used,
        // and for initial page (no before) we will set items = messages (or merge).
        const arg = action.meta.arg || {};
        const isPagingOlder = !!arg.before; // if before provided, this is loading older messages
        if (isPagingOlder) {
          // prepend older messages (avoid duplicates)
          const existingIds = new Set(state.byChannel[ch].items.map((m) => String(m._id)));
          const toAdd = (messages || []).filter((m) => !existingIds.has(String(m._id)));
          state.byChannel[ch].items = [...toAdd, ...state.byChannel[ch].items];
        } else {
          // initial load or refresh - replace list with messages (but keep any newer socket-received messages appended later)
          state.byChannel[ch].items = [...(messages || [])];
        }

        state.byChannel[ch].loading = false;
        state.byChannel[ch].hasMore = !!hasMore;
        _syncList(state.byChannel[ch]);
      })
      .addCase(fetchMessagesThunk.rejected, (state, action) => {
        const { channelId } = action.meta.arg || {};
        if (!channelId) return;
        const ch = String(channelId);
        state.byChannel[ch] = state.byChannel[ch] || { items: [], loading: false, hasMore: true };
        state.byChannel[ch].loading = false;
        _syncList(state.byChannel[ch]);
      })

      // postMessageThunk: server returns new message — append if missing
      .addCase(postMessageThunk.fulfilled, (state, action) => {
        const msg = action.payload;
        const ch = String(msg.channelId);
        state.byChannel[ch] = state.byChannel[ch] || { items: [], loading: false, hasMore: true };
        const exists = state.byChannel[ch].items.some((m) => String(m._id) === String(msg._id));
        if (!exists) state.byChannel[ch].items.push(msg);
        _syncList(state.byChannel[ch]);
      })
      .addCase(editMessageThunk.fulfilled, (state, action) => {
        const msg = action.payload;
        const ch = String(msg.channelId);
        const list = state.byChannel[ch]?.items || [];
        const idx = list.findIndex((m) => String(m._id) === String(msg._id));
        if (idx !== -1) list[idx] = msg;
        _syncList(state.byChannel[ch]);
      })
      .addCase(deleteMessageThunk.fulfilled, (state, action) => {
        const messageId = action.payload;
        for (const ch of Object.keys(state.byChannel)) {
          state.byChannel[ch].items = state.byChannel[ch].items.filter(
            (m) => String(m._id) !== String(messageId)
          );
          _syncList(state.byChannel[ch]);
        }
      });
  },
});

const {
  receiveMessage,
  messageEdited,
  messageDeleted,
  prependMessages,
  clearChannel,
  addOptimisticMessage,
} = slice.actions;

export { receiveMessage, messageEdited, messageDeleted, prependMessages, clearChannel, addOptimisticMessage };
export const clearChannelMessages = clearChannel;
export default slice.reducer;
