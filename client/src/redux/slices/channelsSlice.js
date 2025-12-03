// client/src/redux/slices/channelsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchChannels as fetchChannelsApi,
  createChannel as createChannelApi,
  searchChannelsApi,
  requestJoinChannelApi,
  approveJoinRequestApi,
  rejectJoinRequestApi,
  leaveChannelApi,
  deleteChannelApi,
} from "../../api/authApi";

/**
 * Thunks
 */

// Fetch channels that the current user is a member of
export const fetchChannelsThunk = createAsyncThunk(
  "channels/fetch",
  async () => {
    const res = await fetchChannelsApi({ mine: true });
    // res should be { ok: true, channels: [...] }
    return res.channels || [];
  }
);

export const createChannelThunk = createAsyncThunk(
  "channels/create",
  async (payload) => {
    const res = await createChannelApi(payload);
    return res.channel;
  }
);

export const searchChannelsThunk = createAsyncThunk(
  "channels/search",
  async (q) => {
    const res = await searchChannelsApi(q);
    return res.channels || [];
  }
);

export const requestJoinThunk = createAsyncThunk(
  "channels/requestJoin",
  async (channelId) => {
    const res = await requestJoinChannelApi(channelId);
    // server returns { ok: true, status: 'pending' }
    return { channelId, status: res.status || "pending" };
  }
);

export const approveRequestThunk = createAsyncThunk(
  "channels/approveRequest",
  async ({ channelId, userId }) => {
    const res = await approveJoinRequestApi(channelId, userId);
    // return the updated channel document (server responds with channel)
    return { channel: res.channel, channelId, userId };
  }
);

export const rejectRequestThunk = createAsyncThunk(
  "channels/rejectRequest",
  async ({ channelId, userId }) => {
    const res = await rejectJoinRequestApi(channelId, userId);
    return { channelId, userId };
  }
);

export const leaveChannelThunk = createAsyncThunk(
  "channels/leaveChannel",
  async (channelId) => {
    const res = await leaveChannelApi(channelId);
    // server returns { ok: true, channel: <channelDoc> } or similar
    return channelId;
  }
);

export const deleteChannelThunk = createAsyncThunk(
  "channels/deleteChannel",
  async (channelId) => {
    const res = await deleteChannelApi(channelId);
    return channelId;
  }
);

/**
 * Slice
 */
const slice = createSlice({
  name: "channels",
  initialState: {
    list: [], // channels where the current user is member
    currentChannelId: null,
    searchResults: [], // results from channel search
    incomingRequests: [], // [{ channelId, channelName, requester: { _id, name } }]
    status: "idle",
    error: null,
  },
  reducers: {
    setCurrentChannel(state, action) {
      state.currentChannelId = action.payload;
    },
    addChannel(state, action) {
      // new channel (likely created by this user)
      state.list.unshift(action.payload);
    },
    removeChannel(state, action) {
      const id = action.payload;
      state.list = state.list.filter((c) => String(c._id) !== String(id));
      if (String(state.currentChannelId) === String(id)) state.currentChannelId = null;
    },
    updateChannelMembers(state, action) {
      const { channelId, members } = action.payload;
      const idx = state.list.findIndex((c) => String(c._id) === String(channelId));
      if (idx !== -1) state.list[idx].members = members;
    },

    // Search results setter (used by ChannelSearch)
    setSearchResults(state, action) {
      state.searchResults = action.payload;
    },

    // Incoming join requests (creator receives these via socket)
    addIncomingRequest(state, action) {
      const r = action.payload;
      const exists = state.incomingRequests.find(
        (x) => String(x.channelId) === String(r.channelId) && String(x.requester?._id) === String(r.requester?._id)
      );
      if (!exists) state.incomingRequests.unshift(r);
    },
    removeIncomingRequest(state, action) {
      const { channelId, userId } = action.payload;
      state.incomingRequests = state.incomingRequests.filter(
        (r) => !(String(r.channelId) === String(channelId) && String(r.requester?._id) === String(userId))
      );
    },
    markRequestApproved(state, action) {
      const { channelId, userId } = action.payload;
      state.incomingRequests = state.incomingRequests.filter(
        (r) => !(String(r.channelId) === String(channelId) && String(r.requester?._id) === String(userId))
      );
    },
    // optional: clear search results
    clearSearchResults(state) {
      state.searchResults = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChannelsThunk.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchChannelsThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload;
      })
      .addCase(fetchChannelsThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error?.message || "Failed to load channels";
      });

    builder.addCase(createChannelThunk.fulfilled, (state, action) => {
      state.list.unshift(action.payload);
    });

    builder.addCase(searchChannelsThunk.fulfilled, (state, action) => {
      // attach joinStatus default for UI convenience
      state.searchResults = (action.payload || []).map((c) => ({ ...c, joinStatus: c.joinStatus || "join" }));
    });

    builder.addCase(requestJoinThunk.fulfilled, (state, action) => {
      const { channelId } = action.payload;
      state.searchResults = state.searchResults.map((c) =>
        String(c._id) === String(channelId) ? { ...c, joinStatus: "pending" } : c
      );
    });

    builder.addCase(approveRequestThunk.fulfilled, (state, action) => {
      // When creator approves, remove incoming request from list
      const { channelId, userId } = action.payload;
      state.incomingRequests = state.incomingRequests.filter(
        (r) => !(String(r.channelId) === String(channelId) && String(r.requester?._id) === String(userId))
      );
      // Note: the approved user will fetch channels and see this channel in their sidebar.
    });

    builder.addCase(rejectRequestThunk.fulfilled, (state, action) => {
      const { channelId, userId } = action.payload;
      state.incomingRequests = state.incomingRequests.filter(
        (r) => !(String(r.channelId) === String(channelId) && String(r.requester?._id) === String(userId))
      );
      // Optionally update searchResults for the requester via socket handler
    });

    builder.addCase(leaveChannelThunk.fulfilled, (state, action) => {
      const channelId = action.payload;
      state.list = state.list.filter((c) => String(c._id) !== String(channelId));
      if (String(state.currentChannelId) === String(channelId)) state.currentChannelId = null;
    });

    builder.addCase(deleteChannelThunk.fulfilled, (state, action) => {
      const channelId = action.payload;
      state.list = state.list.filter((c) => String(c._id) !== String(channelId));
      if (String(state.currentChannelId) === String(channelId)) state.currentChannelId = null;
    });
  },
});

export const {
  setCurrentChannel,
  addChannel,
  removeChannel,
  updateChannelMembers,
  setSearchResults,
  addIncomingRequest,
  removeIncomingRequest,
  markRequestApproved,
  clearSearchResults,
} = slice.actions;

export default slice.reducer;
