import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import channelsReducer from "./slices/channelsSlice";
import messagesReducer from "./slices/messagesSlice";
import presenceReducer from "./slices/presenceSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    channels: channelsReducer,
    messages: messagesReducer,
    presence: presenceReducer
  }
});

export default store;
