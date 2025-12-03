import { Server } from "socket.io";
import { verifyToken } from "../utils/jwt.js";
import Message from "../models/Message.js";
import Channel from "../models/Channel.js";

let io = null;

const userSockets = new Map();

function getKey(uid) {
  return uid == null ? null : String(uid);
}

function registerUserSocket(userId, socketId) {
  if (!userId) return;
  const key = getKey(userId);
  const set = userSockets.get(key) || new Set();
  const wasOffline = set.size === 0;
  set.add(socketId);
  userSockets.set(key, set);

  if (wasOffline) {
    emitPresenceUpdate(userId, true);
  }
}

function unregisterUserSocket(userId, socketId) {
  if (!userId) return;
  const key = getKey(userId);
  const set = userSockets.get(key);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) {
    userSockets.delete(key);
    emitPresenceUpdate(userId, false);
  } else {
    userSockets.set(key, set);
  }
}

function emitToUserSocket(userId, event, payload) {
  if (!io || !userId) return 0;
  const key = getKey(userId);
  const set = userSockets.get(key);
  if (!set || set.size === 0) return 0;
  let sent = 0;
  for (const sid of set) {
    const sock = io.sockets.sockets.get(sid);
    if (sock) {
      try {
        sock.emit(event, payload);
        sent++;
      } catch (err) {
        console.warn(
          "[emitToUserSocket] failed to emit to",
          sid,
          err?.message || err
        );
      }
    }
  }
  return sent;
}

function emitPresenceUpdate(userId, online) {
  try {
    if (!io) return;
    const payload = { userId: String(userId), online: !!online };
    io.emit("presence:update", payload);
    console.log(
      `[presence] ${payload.userId} => ${payload.online ? "online" : "offline"}`
    );
  } catch (err) {
    console.warn("emitPresenceUpdate failed", err?.message || err);
  }
}

export function initSocket(httpServer, options = {}) {
  if (io) return io;

  io = new Server(httpServer, {
    cors: {
      origin:
        options.corsOrigin ||
        process.env.CLIENT_ORIGIN ||
        "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake?.auth?.token;
      if (!token) return next();
      const payload = verifyToken(token);
      if (!payload || !payload.userId) return next();
      socket.userId = payload.userId;
      socket.userName = payload.name || payload.username || null;
      return next();
    } catch (err) {
      console.error("[socket auth] error:", err?.message || err);
      return next();
    }
  });

  io.on("connection", (socket) => {
    const socketId = socket.id;
    const userId = socket.userId;

    console.log(
      "Socket connected:",
      socketId,
      "userId:",
      userId || "anonymous"
    );

    if (userId) {
      registerUserSocket(userId, socketId);
    }

    socket.on("channel:join", async ({ channelId } = {}) => {
      if (!channelId) return;
      const room = getChannelRoom(channelId);
      socket.join(room);
      console.log(
        `[socket] ${socketId} joined ${room} userId=${socket.userId || "anon"}`
      );

      try {
        if (socket.userId) {
          const ch = await Channel.findById(channelId);
          if (ch) {
            const present = (ch.members || []).some(
              (m) => String(m) === String(socket.userId)
            );
            if (!present) {
              ch.members.push(socket.userId);
              await ch.save();
            }
          }
        }
        io.to(room).emit("channel:members:updated", {
          channelId: String(channelId),
        });
      } catch (err) {
        console.error("[socket] channel:join handler error", err);
      }
    });

    socket.on("channel:leave", ({ channelId } = {}) => {
      if (!channelId) return;
      const room = getChannelRoom(channelId);
      socket.leave(room);
      console.log(
        `[socket] ${socketId} left ${room} userId=${socket.userId || "anon"}`
      );

      io.to(room).emit("channel:members:updated", {
        channelId: String(channelId),
      });
    });

    socket.on("typing:start", ({ channelId } = {}) => {
      if (!channelId) return;
      io.to(getChannelRoom(channelId)).emit("typing:started", {
        channelId,
        userId: socket.userId,
      });
    });

    socket.on("typing:stop", ({ channelId } = {}) => {
      if (!channelId) return;
      io.to(getChannelRoom(channelId)).emit("typing:stopped", {
        channelId,
        userId: socket.userId,
      });
    });

    socket.on("message:new", async (payload, ack) => {
      try {
        const { channelId, text, attachments, clientId } = payload || {};
        const senderId = socket.userId;
        if (!senderId)
          return ack?.({ ok: false, error: "Unauthorized (socket)" });
        if (!channelId)
          return ack?.({ ok: false, error: "channelId required" });

        const msg = await Message.create({
          channelId,
          senderId,
          text: text || "",
          attachments: attachments || [],
          clientId: clientId || null,
        });

        const populated = await msg.populate({
          path: "senderId",
          select: "name",
        });

        const out = {
          _id: populated._id,
          channelId: String(populated.channelId),
          senderId: String(populated.senderId._id),
          senderName: populated.senderId.name,
          text: populated.text,
          attachments: populated.attachments,
          clientId: populated.clientId,
          createdAt: populated.createdAt,
          editedAt: populated.editedAt,
          deleted: populated.deleted,
        };

        io.to(getChannelRoom(channelId)).emit("message:received", out);
        if (ack) ack({ ok: true, message: out });
      } catch (err) {
        console.error("[socket] message:new error", err);
        if (ack) ack({ ok: false, error: err.message });
      }
    });

    socket.on("message:edit", async ({ messageId, text } = {}, ack) => {
      try {
        const userId = socket.userId;
        if (!userId)
          return ack?.({ ok: false, error: "Unauthorized (socket)" });
        if (!messageId)
          return ack?.({ ok: false, error: "messageId required" });

        const msg = await Message.findById(messageId);
        if (!msg) return ack?.({ ok: false, error: "Message not found" });
        if (String(msg.senderId) !== String(userId))
          return ack?.({ ok: false, error: "Forbidden" });

        msg.text = text;
        msg.editedAt = new Date();
        await msg.save();

        io.to(getChannelRoom(msg.channelId)).emit("message:edited", msg);
        return ack?.({ ok: true, message: msg });
      } catch (err) {
        console.error("[socket] message:edit error", err);
        return ack?.({ ok: false, error: err.message });
      }
    });

    socket.on("message:delete", async ({ messageId } = {}, ack) => {
      try {
        const userId = socket.userId;
        if (!userId)
          return ack?.({ ok: false, error: "Unauthorized (socket)" });
        if (!messageId)
          return ack?.({ ok: false, error: "messageId required" });

        const msg = await Message.findById(messageId);
        if (!msg) return ack?.({ ok: false, error: "Message not found" });

        const channel = await Channel.findById(msg.channelId);
        const allowed =
          String(msg.senderId) === String(userId) ||
          (channel && String(channel.createdBy) === String(userId));
        if (!allowed) return ack?.({ ok: false, error: "Forbidden" });

        msg.deleted = true;
        await msg.save();

        io.to(getChannelRoom(msg.channelId)).emit("message:deleted", {
          messageId: msg._id,
        });
        return ack?.({ ok: true });
      } catch (err) {
        console.error("[socket] message:delete error", err);
        return ack?.({ ok: false, error: err.message });
      }
    });

    socket.on("disconnect", (reason) => {
      if (socket.userId) {
        unregisterUserSocket(socket.userId, socket.id);
      }
      console.log(
        "Socket disconnected:",
        socket.id,
        "userId:",
        socket.userId || "anon",
        "reason:",
        reason
      );
    });

    socket.on("error", (err) => {
      console.warn("Socket error", err);
    });
  });

  console.log("Socket.IO initialized");
  return io;
}

function getChannelRoom(channelId) {
  return `channel_${channelId}`;
}

export function getIO() {
  if (!io)
    throw new Error(
      "Socket.io not initialized. Call initSocket(server) first."
    );
  return io;
}

export { emitToUserSocket };
export default initSocket;
