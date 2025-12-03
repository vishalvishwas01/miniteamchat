import Channel from "../models/Channel.js";
import Message from "../models/Message.js";
import mongoose from "mongoose";              // <- ADD THIS
import { getIO } from "../sockets/index.js";
import { emitToUserSocket } from "../sockets/index.js";

/**
 * GET /api/channels
 * Query: ?mine=true will return channels where user is a member
 */
export async function listChannels(req, res, next) {
  try {
    const { mine } = req.query;
    // if token missing, force empty
    const userId = req.userId;

    // Default behavior: return only channels where the user is a member
    if (mine === "false") {
      // explicit request for all channels (not recommended unless authorized)
      const channels = await Channel.find().populate({ path: "members", select: "name" });
      return res.json({ ok: true, channels });
    }

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const channels = await Channel.find({ members: userId }).populate({ path: "members", select: "name" });
    // normalize members if needed
    const out = channels.map((c) => ({
      _id: c._id,
      name: c.name,
      isPrivate: !!c.isPrivate,
      createdBy: c.createdBy,
      members: (c.members || []).map((m) => ({ _id: m._id, name: m.name })),
      createdAt: c.createdAt
    }));

    res.json({ ok: true, channels: out });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/channels
 * body: { name, isPrivate }
 */
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

/**
 * POST /api/channels/:id/join
 */
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

/**
 * POST /api/channels/:id/leave
 */
export async function leaveChannel(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid channel id" });

    const ch = await Channel.findById(id);
    if (!ch) return res.status(404).json({ error: "Channel not found" });

    const originalCount = (ch.members || []).length;
    ch.members = (ch.members || []).filter((m) => String(m) !== String(userId));
    // If no change, return success but indicate nothing changed
    if (ch.members.length === originalCount) {
      // still broadcast a members update to keep clients consistent
      try {
        const io = getIO();
        io.to(`channel_${id}`).emit("channel:members:updated", { channelId: String(id) });
        io.emit("channel:member:left", { channelId: String(id), userId: String(userId) });
      } catch (err) {
        console.warn("[leaveChannel] broadcast failed", err?.message || err);
      }
      return res.json({ ok: true, channel: ch, note: "user was not in members list" });
    }

    await ch.save();

    // Notify everyone in that room and globally about member change
    try {
      const io = getIO();
      io.to(`channel_${id}`).emit("channel:members:updated", { channelId: String(id) });
      io.emit("channel:member:left", { channelId: String(id), userId: String(userId) });
    } catch (err) {
      console.warn("[leaveChannel] warning: Socket.IO not available to emit members update", err?.message || err);
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

    console.log(`[getChannelMembers] Found channel with ${channel.members.length} members and ${channel.pendingRequests.length} pending requests`);

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
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid channel id" });

    // find channel
    const ch = await Channel.findById(id);
    if (!ch) return res.status(404).json({ error: "Channel not found" });

    // permission check
    if (String(ch.createdBy) !== String(userId)) {
      return res.status(403).json({ error: "Only the channel creator can delete the channel" });
    }

    // delete messages for the channel
    try {
      await Message.deleteMany({ channelId: ch._id });
    } catch (err) {
      console.error("[deleteChannel] error deleting messages for channel", id, err);
      // continue — it's not fatal if message deletion failed, but log it
    }

    // delete channel document
    try {
      await Channel.findByIdAndDelete(ch._id);
    } catch (err) {
      console.error("[deleteChannel] error deleting channel document", id, err);
      return res.status(500).json({ error: "Failed to delete channel" });
    }

    // broadcast deletion to clients
    try {
      const io = getIO();
      io.emit("channel:deleted", { channelId: String(id) });
    } catch (err) {
      console.warn("[deleteChannel] warning: Socket.IO not available to emit channel:deleted", err?.message || err);
    }

    return res.json({ ok: true, channelId: id });
  } catch (err) {
    console.error("[deleteChannel] unexpected error:", err);
    return res.status(500).json({ error: "Server error", details: err?.message });
  }
}

export async function searchChannels(req, res, next) {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ ok: true, channels: [] });

    // regex search: simple, case-insensitive
    const docs = await Channel.find({ name: { $regex: q, $options: "i" } })
      .limit(30)
      .populate({ path: "createdBy", select: "name" });

    const channels = docs.map((c) => ({
      _id: c._id,
      name: c.name,
      createdBy: { _id: c.createdBy?._id, name: c.createdBy?.name },
      isPrivate: !!c.isPrivate,
      memberCount: (c.members || []).length,
      // do not expose members for private channels
    }));

    res.json({ ok: true, channels });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/channels/:id/join-request
 * Authenticated user requests to join a channel.
 */
export async function requestJoinChannel(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const ch = await Channel.findById(id).populate({ path: "createdBy", select: "name" });
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

    // targeted notify: only to creator
    try {
      const payload = {
        channelId: String(ch._id),
        channelName: ch.name,
        requester: { _id: String(userId), name: req.userName || null } // req.userName depends on your auth middleware
      };
      const sent = emitToUserSocket(String(userId), "channel:request:rejected", { channelId: String(id), userId: String(userId) });
      console.log(`[join-request] sent ${sent} socket(s) to channel creator ${ch.createdBy}`);
    } catch (err) {
      console.warn("joinRequest: targeted emit failed", err?.message || err);
    }

    res.json({ ok: true, status: "pending" });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/channels/:id/approve-request
 * body: { userId }
 * Only channel creator may approve.
 */
export async function approveJoinRequest(req, res, next) {
  try {
    const { id } = req.params;
    const approver = req.userId;
    const { userId } = req.body;
    if (!approver) return res.status(401).json({ error: "Unauthorized" });
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ error: "Invalid id" });

    const ch = await Channel.findById(id);
    if (!ch) return res.status(404).json({ error: "Channel not found" });

    if (String(ch.createdBy) !== String(approver)) return res.status(403).json({ error: "Only creator can approve requests" });

    // remove from pendingRequests if present
    ch.pendingRequests = (ch.pendingRequests || []).filter((m) => String(m) !== String(userId));
    // add to members if not already
    if (!((ch.members || []).some((m) => String(m) === String(userId)))) {
      ch.members.push(userId);
    }
    await ch.save();

    // notify the requester (socket) and broadcast members update
   // after adding user to members and saving:
try {
  // notify requester only
  emitToUserSocket(String(userId), "channel:request:approved", { channelId: String(id), userId: String(userId) });
  // notify room that members updated
  const io = getIO();
  io.to(`channel_${id}`).emit("channel:members:updated", { channelId: String(id) });
} catch (err) {
  console.warn("approveJoinRequest: socket emit failed", err?.message || err);
}


    res.json({ ok: true, channel: ch });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/channels/:id/reject-request
 * body: { userId }
 * Only channel creator may reject.
 */
export async function rejectJoinRequest(req, res, next) {
  try {
    const { id } = req.params;
    const approver = req.userId;
    const { userId } = req.body;
    if (!approver) return res.status(401).json({ error: "Unauthorized" });
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ error: "Invalid id" });

    const ch = await Channel.findById(id);
    if (!ch) return res.status(404).json({ error: "Channel not found" });

    if (String(ch.createdBy) !== String(approver)) return res.status(403).json({ error: "Only creator can reject requests" });

    ch.pendingRequests = (ch.pendingRequests || []).filter((m) => String(m) !== String(userId));
    await ch.save();

    try {
      const io = getIO();
      io.emit("channel:request:rejected", { channelId: String(id), userId: String(userId) });
    } catch (err) {
      console.warn("rejectJoinRequest: socket emit failed", err?.message || err);
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// server/controllers/channelController.js
export async function removeMember(req, res, next) {
  try {
    const { id } = req.params; // channel id
    const { userId } = req.body; // user to remove
    const actor = req.userId; // caller

    if (!actor) return res.status(401).json({ error: "Unauthorized" });
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ error: "Invalid id" });

    const ch = await Channel.findById(id);
    if (!ch) return res.status(404).json({ error: "Channel not found" });

    // only creator can remove
    if (String(ch.createdBy) !== String(actor)) return res.status(403).json({ error: "Only creator can remove members" });

    ch.members = (ch.members || []).filter((m) => String(m) !== String(userId));
    await ch.save();

    const io = getIO();
    io.to(`channel_${id}`).emit("channel:members:updated", { channelId: String(id) });
    // optionally notify removed user
    emitToUserSocket(String(userId), "channel:removed", { channelId: String(id) });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
