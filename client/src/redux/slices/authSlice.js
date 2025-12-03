import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as api from "../../api/authApi";

const persisted = (() => {
  try {
    const raw = localStorage.getItem("chat_auth");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
})();

const initialState = {
  user: persisted?.user || null,
  token: persisted?.token || null,
  status: "idle",
  error: null,
};

export const signupThunk = createAsyncThunk("auth/signup", async (payload) => {
  console.log("[signupThunk] Sending signup payload:", payload);
  const res = await api.signup(payload);
  console.log("[signupThunk] Response:", res);
  return res;
});

export const loginThunk = createAsyncThunk("auth/login", async (payload) => {
  console.log("[loginThunk] Sending login payload:", payload);
  const res = await api.login(payload);
  console.log("[loginThunk] Response:", res);
  return res;
});

export const verifyMe = createAsyncThunk(
  "auth/verifyMe",
  async (_, { getState }) => {
    const res = await api.me();
    return res.user;
  }
);

const slice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loadFromLocal(state) {
      const persisted = (() => {
        try {
          const raw = localStorage.getItem("chat_auth");
          if (!raw) return null;
          return JSON.parse(raw);
        } catch (e) {
          return null;
        }
      })();

      if (persisted) {
        state.user = persisted.user;
        state.token = persisted.token;
      }
    },
    logout(state) {
      state.user = null;
      state.token = null;
      localStorage.removeItem("chat_auth");
    },
    saveAuth(state, action) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      localStorage.setItem(
        "chat_auth",
        JSON.stringify({ user: state.user, token: state.token })
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signupThunk.fulfilled, (state, action) => {
        console.log("[signupThunk fulfilled] Payload:", action.payload);
        state.user = action.payload.user;
        state.token = action.payload.token;
        console.log(
          "[signupThunk fulfilled] Saved token to state:",
          state.token
        );
        localStorage.setItem(
          "chat_auth",
          JSON.stringify({ user: state.user, token: state.token })
        );
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        console.log("[loginThunk fulfilled] Payload:", action.payload);
        state.user = action.payload.user;
        state.token = action.payload.token;
        console.log(
          "[loginThunk fulfilled] Saved token to state:",
          state.token
        );
        localStorage.setItem(
          "chat_auth",
          JSON.stringify({ user: state.user, token: state.token })
        );
      })
      .addCase(verifyMe.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(verifyMe.rejected, (state) => {
        state.user = null;
        state.token = null;
        localStorage.removeItem("chat_auth");
      });
  },
});

export const { loadFromLocal, logout, saveAuth } = slice.actions;
export default slice.reducer;
