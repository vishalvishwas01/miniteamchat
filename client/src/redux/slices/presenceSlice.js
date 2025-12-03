import { createSlice } from "@reduxjs/toolkit";

const slice = createSlice({
  name: "presence",
  initialState: { byId: {} },
  reducers: {
    setPresence(state, action) {
      const { userId, online } = action.payload;
      state.byId[userId] = { online };
    }
  }
});

export const { setPresence } = slice.actions;
export default slice.reducer;
