import { io } from "socket.io-client";

let socket = null;
let currentToken = null;
let readyCallbacks = [];

function createSocket(token) {
  const server = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";
  const s = io(server, {
    auth: { token },
    transports: ["websocket"],
    autoConnect: true
  });

  s.on("connect", () => {
    console.log("[socketClient] connected", s.id);
    readyCallbacks.forEach((cb) => {
      try { cb(s); } catch (e) { console.error(e); }
    });
    readyCallbacks = [];
  });

  s.on("connect_error", (err) => {
    console.warn("[socketClient] connect_error", err?.message || err);
  });

  s.on("disconnect", (reason) => {
    console.log("[socketClient] disconnected", reason);
  });

  return s;
}

const socketClient = {
  init(token) {
    if (!token) {
      if (socket) {
        socket.disconnect();
        socket = null;
        currentToken = null;
      }
      return null;
    }

    if (!socket || currentToken !== token) {
      if (socket) {
        try { socket.disconnect(); } catch (e) {}
        socket = null;
      }
      currentToken = token;
      socket = createSocket(token);
    }
    return socket;
  },

  get() {
    return socket;
  },

  onReady(cb) {
    if (socket && socket.connected) {
      try { cb(socket); } catch (e) { console.error(e); }
      return;
    }
    readyCallbacks.push(cb);
  },

  disconnect() {
    if (socket) {
      try { socket.disconnect(); } catch (e) { }
      socket = null;
      currentToken = null;
    }
  }
};

export default socketClient;
