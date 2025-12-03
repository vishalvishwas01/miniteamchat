
import { createSlice } from "@reduxjs/toolkit";

const slice = createSlice({
  name: "typing",
  initialState: {
    byChannel: {},
  },
  reducers: {
    typingStarted(state, action) {
      const { channelId, user } = action.payload; 
      if (!channelId || !user || !user._id) return;
      const cid = String(channelId);
      const uid = String(user._id);
      state.byChannel[cid] = state.byChannel[cid] || {};
      state.byChannel[cid][uid] = { name: user.name || "", since: Date.now() };
    },
    typingStopped(state, action) {
      const { channelId, userId } = action.payload;
      if (!channelId || !userId) return;
      const cid = String(channelId);
      const uid = String(userId);
      if (!state.byChannel[cid]) return;
      delete state.byChannel[cid][uid];
      
      if (Object.keys(state.byChannel[cid]).length === 0) delete state.byChannel[cid];
    },
    clearChannelTyping(state, action) {
      const cid = String(action.payload);
      delete state.byChannel[cid];
    },
  },
});

export const { typingStarted, typingStopped, clearChannelTyping } = slice.actions;
export default slice.reducer;


export const selectTypingUsers = (state, channelId) => {
  const map = (state.typing && state.typing.byChannel && state.typing.byChannel[String(channelId)]) || {};
  return Object.keys(map).map((uid) => ({ _id: uid, name: map[uid].name, since: map[uid].since }));
};
