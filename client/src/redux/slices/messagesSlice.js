
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchMessages as apiFetchMessages,
  postMessage,
  editMessage as apiEditMessage,
  deleteMessage as apiDeleteMessage,
} from "../../api/authApi";


const _syncList = (chState) => {
  if (!chState) return;
  chState.list = chState.items;
};

export const fetchMessagesThunk = createAsyncThunk(
  "messages/fetch",
  async ({ channelId, limit = 30, before = null }, { rejectWithValue }) => {
    try {
      const res = await apiFetchMessages({ channelId, limit, before });
      
      return { channelId, messages: res.messages || [], hasMore: !!res.hasMore };
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);


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
      
    },
    status: "idle",
  },
  reducers: {
    
    addOptimisticMessage(state, action) {
      const msg = action.payload;
      const channelId = String(msg.channelId || (msg.channelId?._id ?? ""));
      if (!channelId) return;
      if (!state.byChannel[channelId]) state.byChannel[channelId] = { items: [], loading: false, hasMore: true };
      const exists = state.byChannel[channelId].items.some((m) => String(m._id) === String(msg._id));
      if (!exists) state.byChannel[channelId].items.push(msg);
      _syncList(state.byChannel[channelId]);
    },

    
    receiveMessage(state, action) {
      const msg = action.payload;
      const channelId = msg.channelId?._id ? String(msg.channelId._id) : String(msg.channelId);
      if (!channelId) return;
      if (!state.byChannel[channelId]) state.byChannel[channelId] = { items: [], loading: false, hasMore: true };

      
      if (msg.clientId) {
        const tempIdx = state.byChannel[channelId].items.findIndex((m) => String(m._id) === String(msg.clientId));
        if (tempIdx !== -1) {
          
          state.byChannel[channelId].items[tempIdx] = msg;
            _syncList(state.byChannel[channelId]);
          return;
        }
      }

      
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
      
      
      const idx = ch.items.findIndex((m) => String(m._id) === String(messageId));
      if (idx !== -1) ch.items.splice(idx, 1);
      _syncList(ch);
    },

    
    prependMessages(state, action) {
      const { channelId, messages } = action.payload;
      const ch = String(channelId);
      if (!state.byChannel[ch]) state.byChannel[ch] = { items: [], loading: false, hasMore: true };
      
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

        
        
        const arg = action.meta.arg || {};
        const isPagingOlder = !!arg.before; 
        if (isPagingOlder) {
          
          const existingIds = new Set(state.byChannel[ch].items.map((m) => String(m._id)));
          const toAdd = (messages || []).filter((m) => !existingIds.has(String(m._id)));
          state.byChannel[ch].items = [...toAdd, ...state.byChannel[ch].items];
        } else {
          
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
