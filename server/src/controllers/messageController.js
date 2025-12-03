
import Message from "../models/Message.js";
import Channel from "../models/Channel.js";
import mongoose from "mongoose";
import { getIO } from "../sockets/index.js"; 


export async function createMessage(req, res, next) {
  try {
    const { channelId, text, attachments, clientId } = req.body;
    const senderId = req.userId;
    if (!senderId) return res.status(401).json({ error: "Unauthorized" });
    if (!channelId) return res.status(400).json({ error: "channelId required" });

    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    const message = await Message.create({
      channelId,
      senderId,
      text: text || "",
      attachments: attachments || [],
      clientId: clientId || null
    });

    
    const populated = await message.populate({ path: "senderId", select: "name" });
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
      deleted: populated.deleted
    };

    
    try {
      const io = getIO();
      io.to(`channel_${channelId}`).emit("message:received", out);
      console.log(`[server] emitted message:received channel_${channelId} msgId=${out._id}`);
    } catch (err) {
      console.warn("Socket.IO not available to emit message:received", err?.message || err);
    }

    res.status(201).json({ ok: true, message: out });
  } catch (err) {
    next(err);
  }
}


export async function listMessages(req, res, next) {
  try {
    const { channelId, before, limit: qLimit } = req.query;
    const limit = Math.max(1, Math.min(100, parseInt(qLimit, 10) || 30));

    if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
      return res.status(400).json({ error: "channelId required and must be valid" });
    }

    const q = { channelId: new mongoose.Types.ObjectId(channelId), deleted: false };

    
    if (before) {
      if (/^[0-9a-fA-F]{24}$/.test(before)) {
        const ref = await Message.findById(before).select("createdAt").lean();
        if (ref && ref.createdAt) {
          q.createdAt = { $lt: ref.createdAt };
        } else {
          const dt = new Date(before);
          if (!isNaN(dt)) q.createdAt = { $lt: dt };
        }
      } else {
        const dt = new Date(before);
        if (!isNaN(dt)) q.createdAt = { $lt: dt };
      }
    }

    
    const docs = await Message.find(q)
      .sort({ createdAt: -1 })
      .limit(limit + 1) 
      .populate({ path: "senderId", select: "name" })
      .lean();

    const hasMore = docs.length > limit;
    const sliced = docs.slice(0, limit);
    const messages = sliced
      .reverse()
      .map((m) => ({
        _id: m._id,
        channelId: String(m.channelId),
        senderId: m.senderId ? String(m.senderId._id) : String(m.senderId),
        senderName: m.senderId ? m.senderId.name : null,
        text: m.text,
        attachments: m.attachments || [],
        clientId: m.clientId || null,
        createdAt: m.createdAt,
        editedAt: m.editedAt,
        deleted: m.deleted || false,
      }));

    res.json({ ok: true, messages, hasMore });
  } catch (err) {
    next(err);
  }
}


export async function editMessage(req, res, next) {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ error: "Message not found" });
    if (String(msg.senderId) !== String(userId)) return res.status(403).json({ error: "Forbidden" });

    msg.text = text;
    msg.editedAt = new Date();
    await msg.save();

    try {
      const io = getIO();
      io.to(`channel_${msg.channelId}`).emit("message:edited", msg);
    } catch (err) {
      console.warn("Socket.IO not available to emit message:edited", err?.message || err);
    }

    res.json({ ok: true, message: msg });
  } catch (err) {
    next(err);
  }
}


export async function deleteMessage(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ error: "Message not found" });

    const channel = await Channel.findById(msg.channelId);
    const allowed = String(msg.senderId) === String(userId) || (channel && String(channel.createdBy) === String(userId));
    if (!allowed) return res.status(403).json({ error: "Forbidden" });

    msg.deleted = true;
    await msg.save();

    try {
      const io = getIO();
      io.to(`channel_${msg.channelId}`).emit("message:deleted", { messageId: msg._id });
    } catch (err) {
      console.warn("Socket.IO not available to emit message:deleted", err?.message || err);
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
