import Channel from "../models/Channel.js";
import Message from "../models/Message.js";
import mongoose from "mongoose";
import { getIO } from "../sockets/index.js";
import { emitToUserSocket } from "../sockets/index.js";

export async function listChannels(req, res, next) {
  try {
    const { mine } = req.query;

    const userId = req.userId;

    if (mine === "false") {
      const channels = await Channel.find().populate({
        path: "members",
        select: "name",
      });
      return res.json({ ok: true, channels });
    }

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const channels = await Channel.find({ members: userId }).populate({
      path: "members",
      select: "name",
    });

    const out = channels.map((c) => ({
      _id: c._id,
      name: c.name,
      isPrivate: !!c.isPrivate,
      createdBy: c.createdBy,
      members: (c.members || []).map((m) => ({ _id: m._id, name: m.name })),
      createdAt: c.createdAt,
    }));

    res.json({ ok: true, channels: out });
  } catch (err) {
    next(err);
  }
}

export async function createChannel(req, res, next) {
  try {
    const { name, isPrivate } = req.body;
    const creatorId = req.userId;
    if (!creatorId) return res.status(401).json({ error: "Unauthorized" });
    if (!name) return res.status(400).json({ error: "Channel name required" });

    const channel = await Channel.create({
      name,
      isPrivate: Boolean(isPrivate),
      members: [creatorId],
      createdBy: creatorId,
    });

    res.status(201).json({ ok: true, channel });
  } catch (err) {
    next(err);
  }
}

export async function joinChannel(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const channel = await Channel.findById(id);
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    if (!channel.members.includes(userId)) {
      channel.members.push(userId);
      await channel.save();
    }

    res.json({ ok: true, channel });
  } catch (err) {
    next(err);
  }
}


export async function leaveChannel(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!id || !mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid channel id" });

    const ch = await Channel.findById(id);
    if (!ch) return res.status(404).json({ error: "Channel not found" });

    const originalCount = (ch.members || []).length;
    ch.members = (ch.members || []).filter((m) => String(m) !== String(userId));

    if (ch.members.length === originalCount) {
      try {
        const io = getIO();
        io.to(`channel_${id}`).emit("channel:members:updated", {
          channelId: String(id),
        });
        io.emit("channel:member:left", {
          channelId: String(id),
          userId: String(userId),
        });
      } catch (err) {
        console.warn("[leaveChannel] broadcast failed", err?.message || err);
      }
      return res.json({
        ok: true,
        channel: ch,
        note: "user was not in members list",
      });
    }

    await ch.save();

    try {
      const io = getIO();
      io.to(`channel_${id}`).emit("channel:members:updated", {
        channelId: String(id),
      });
      io.emit("channel:member:left", {
        channelId: String(id),
        userId: String(userId),
      });
    } catch (err) {
      console.warn(
        "[leaveChannel] warning: Socket.IO not available to emit members update",
        err?.message || err
      );
    }

    res.json({ ok: true, channel: ch });
  } catch (err) {
    console.error("[leaveChannel] unexpected error:", err);
    res.status(500).json({ error: "Server error", details: err?.message });
  }
}

export async function getChannelMembers(req, res, next) {
  try {
    const { id } = req.params;
    console.log(`[getChannelMembers] Fetching members for channel: ${id}`);

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      console.log(`[getChannelMembers] Invalid channel id: ${id}`);
      return res.status(400).json({ error: "Invalid channel id" });
    }

    const channel = await Channel.findById(id)
      .populate({ path: "members", select: "name email avatarUrl" })
      .populate({ path: "pendingRequests", select: "name email avatarUrl" })
      .exec();

    if (!channel) {
      console.log(`[getChannelMembers] Channel not found: ${id}`);
      return res.status(404).json({ error: "Channel not found" });
    }

    console.log(
      `[getChannelMembers] Found channel with ${channel.members.length} members and ${channel.pendingRequests.length} pending requests`
    );

    const members = (channel.members || []).map((m) => ({
      _id: m._id,
      name: m.name,
      email: m.email,
      avatarUrl: m.avatarUrl,
    }));
    const pendingRequests = (channel.pendingRequests || []).map((m) => ({
      _id: m._id,
      name: m.name,
      email: m.email,
      avatarUrl: m.avatarUrl,
    }));
    res.json({ ok: true, members, pendingRequests });
  } catch (err) {
    console.error(`[getChannelMembers] Error:`, err);
    next(err);
  }
}

export async function deleteChannel(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!id || !mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid channel id" });

    const ch = await Channel.findById(id);
    if (!ch) return res.status(404).json({ error: "Channel not found" });

    if (String(ch.createdBy) !== String(userId)) {
      return res
        .status(403)
        .json({ error: "Only the channel creator can delete the channel" });
    }

    try {
      await Message.deleteMany({ channelId: ch._id });
    } catch (err) {
      console.error(
        "[deleteChannel] error deleting messages for channel",
        id,
        err
      );
    }

    try {
      await Channel.findByIdAndDelete(ch._id);
    } catch (err) {
      console.error("[deleteChannel] error deleting channel document", id, err);
      return res.status(500).json({ error: "Failed to delete channel" });
    }

    try {
      const io = getIO();
      io.emit("channel:deleted", { channelId: String(id) });
    } catch (err) {
      console.warn(
        "[deleteChannel] warning: Socket.IO not available to emit channel:deleted",
        err?.message || err
      );
    }

    return res.json({ ok: true, channelId: id });
  } catch (err) {
    console.error("[deleteChannel] unexpected error:", err);
    return res
      .status(500)
      .json({ error: "Server error", details: err?.message });
  }
}

export async function searchChannels(req, res, next) {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ ok: true, channels: [] });

    const docs = await Channel.find({ name: { $regex: q, $options: "i" } })
      .limit(30)
      .populate({ path: "createdBy", select: "name" });

    const channels = docs.map((c) => ({
      _id: c._id,
      name: c.name,
      createdBy: { _id: c.createdBy?._id, name: c.createdBy?.name },
      isPrivate: !!c.isPrivate,
      memberCount: (c.members || []).length,
    }));

    res.json({ ok: true, channels });
  } catch (err) {
    next(err);
  }
}

export async function requestJoinChannel(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const ch = await Channel.findById(id).populate({
      path: "createdBy",
      select: "name",
    });
    if (!ch) return res.status(404).json({ error: "Channel not found" });

    if ((ch.members || []).some((m) => String(m) === String(userId))) {
      return res.json({ ok: true, status: "already_member" });
    }
    if ((ch.pendingRequests || []).some((m) => String(m) === String(userId))) {
      return res.json({ ok: true, status: "pending" });
    }

    ch.pendingRequests = ch.pendingRequests || [];
    ch.pendingRequests.push(userId);
    await ch.save();

    try {
      const payload = {
        channelId: String(ch._id),
        channelName: ch.name,
        requester: { _id: String(userId), name: req.userName || null },
      };
      const sent = emitToUserSocket(
        String(userId),
        "channel:request:rejected",
        { channelId: String(id), userId: String(userId) }
      );
      console.log(
        `[join-request] sent ${sent} socket(s) to channel creator ${ch.createdBy}`
      );
    } catch (err) {
      console.warn("joinRequest: targeted emit failed", err?.message || err);
    }

    res.json({ ok: true, status: "pending" });
  } catch (err) {
    next(err);
  }
}

export async function approveJoinRequest(req, res, next) {
  try {
    const { id } = req.params;
    const approver = req.userId;
    const { userId } = req.body;
    if (!approver) return res.status(401).json({ error: "Unauthorized" });
    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(userId)
    )
      return res.status(400).json({ error: "Invalid id" });

    const ch = await Channel.findById(id);
    if (!ch) return res.status(404).json({ error: "Channel not found" });

    if (String(ch.createdBy) !== String(approver))
      return res
        .status(403)
        .json({ error: "Only creator can approve requests" });

    ch.pendingRequests = (ch.pendingRequests || []).filter(
      (m) => String(m) !== String(userId)
    );

    if (!(ch.members || []).some((m) => String(m) === String(userId))) {
      ch.members.push(userId);
    }
    await ch.save();

    try {
      emitToUserSocket(String(userId), "channel:request:approved", {
        channelId: String(id),
        userId: String(userId),
      });

      const io = getIO();
      io.to(`channel_${id}`).emit("channel:members:updated", {
        channelId: String(id),
      });
    } catch (err) {
      console.warn(
        "approveJoinRequest: socket emit failed",
        err?.message || err
      );
    }

    res.json({ ok: true, channel: ch });
  } catch (err) {
    next(err);
  }
}

export async function rejectJoinRequest(req, res, next) {
  try {
    const { id } = req.params;
    const approver = req.userId;
    const { userId } = req.body;
    if (!approver) return res.status(401).json({ error: "Unauthorized" });
    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(userId)
    )
      return res.status(400).json({ error: "Invalid id" });

    const ch = await Channel.findById(id);
    if (!ch) return res.status(404).json({ error: "Channel not found" });

    if (String(ch.createdBy) !== String(approver))
      return res
        .status(403)
        .json({ error: "Only creator can reject requests" });

    ch.pendingRequests = (ch.pendingRequests || []).filter(
      (m) => String(m) !== String(userId)
    );
    await ch.save();

    try {
      const io = getIO();
      io.emit("channel:request:rejected", {
        channelId: String(id),
        userId: String(userId),
      });
    } catch (err) {
      console.warn(
        "rejectJoinRequest: socket emit failed",
        err?.message || err
      );
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function removeMember(req, res, next) {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const actor = req.userId;

    if (!actor) return res.status(401).json({ error: "Unauthorized" });
    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(userId)
    )
      return res.status(400).json({ error: "Invalid id" });

    const ch = await Channel.findById(id);
    if (!ch) return res.status(404).json({ error: "Channel not found" });

    if (String(ch.createdBy) !== String(actor))
      return res.status(403).json({ error: "Only creator can remove members" });

    ch.members = (ch.members || []).filter((m) => String(m) !== String(userId));
    await ch.save();

    const io = getIO();
    io.to(`channel_${id}`).emit("channel:members:updated", {
      channelId: String(id),
    });

    emitToUserSocket(String(userId), "channel:removed", {
      channelId: String(id),
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
