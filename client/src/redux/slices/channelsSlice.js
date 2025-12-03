
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

export const fetchChannelsThunk = createAsyncThunk(
  "channels/fetch",
  async () => {
    const res = await fetchChannelsApi({ mine: true });
    
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
    
    return { channelId, status: res.status || "pending" };
  }
);

export const approveRequestThunk = createAsyncThunk(
  "channels/approveRequest",
  async ({ channelId, userId }) => {
    const res = await approveJoinRequestApi(channelId, userId);
    
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

const slice = createSlice({
  name: "channels",
  initialState: {
    list: [], 
    currentChannelId: null,
    searchResults: [], 
    incomingRequests: [], 
    status: "idle",
    error: null,
  },
  reducers: {
    setCurrentChannel(state, action) {
      state.currentChannelId = action.payload;
    },
    addChannel(state, action) {
      
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

    
    setSearchResults(state, action) {
      state.searchResults = action.payload;
    },

    
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
      
      state.searchResults = (action.payload || []).map((c) => ({ ...c, joinStatus: c.joinStatus || "join" }));
    });

    builder.addCase(requestJoinThunk.fulfilled, (state, action) => {
      const { channelId } = action.payload;
      state.searchResults = state.searchResults.map((c) =>
        String(c._id) === String(channelId) ? { ...c, joinStatus: "pending" } : c
      );
    });

    builder.addCase(approveRequestThunk.fulfilled, (state, action) => {
      
      const { channelId, userId } = action.payload;
      state.incomingRequests = state.incomingRequests.filter(
        (r) => !(String(r.channelId) === String(channelId) && String(r.requester?._id) === String(userId))
      );
      
    });

    builder.addCase(rejectRequestThunk.fulfilled, (state, action) => {
      const { channelId, userId } = action.payload;
      state.incomingRequests = state.incomingRequests.filter(
        (r) => !(String(r.channelId) === String(channelId) && String(r.requester?._id) === String(userId))
      );
      
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
