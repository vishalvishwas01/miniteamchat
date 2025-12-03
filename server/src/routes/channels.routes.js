import express from "express";
import {
  listChannels,
  createChannel,
  joinChannel,
  leaveChannel,
  deleteChannel,
  getChannelMembers,
  searchChannels,
  requestJoinChannel,
  approveJoinRequest,
  rejectJoinRequest,
  removeMember
} from "../controllers/channelController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Specific routes first
router.get("/search", requireAuth, searchChannels); // search must come before /:id to avoid matching as id

router.get("/:id/members", (req, res, next) => {
  console.log(`[/:id/members route] Matched with id=${req.params.id}`);
  getChannelMembers(req, res, next);
});
// Generic routes
router.get("/", requireAuth, listChannels);
router.post("/", requireAuth, createChannel);
router.post("/:id/join", requireAuth, joinChannel);
router.post("/:id/leave", requireAuth, leaveChannel);
router.delete("/:id", requireAuth, deleteChannel);

// join request flow
router.post("/:id/join-request", requireAuth, requestJoinChannel);
router.post("/:id/approve-request", requireAuth, approveJoinRequest);
router.post("/:id/reject-request", requireAuth, rejectJoinRequest);
router.post("/:id/remove-member", requireAuth, removeMember);

export default router;
