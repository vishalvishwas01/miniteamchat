import axios from "axios";
import store from "../redux/store";
import { logout } from "../redux/slices/authSlice";

const baseURL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

const instance = axios.create({
  baseURL: `${baseURL}/api`,
  withCredentials: false
});

// Attach token
instance.interceptors.request.use((config) => {
  const state = store.getState();
  const token = state.auth?.token;
  if (token) config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  return config;
});

// Response error handling (401 -> logout)
instance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      store.dispatch(logout());
    }
    return Promise.reject(err);
  }
);

export default instance;
