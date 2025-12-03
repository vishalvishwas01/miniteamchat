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
  removeMember,
} from "../controllers/channelController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/search", requireAuth, searchChannels);

router.get("/:id/members", (req, res, next) => {
  console.log(`[/:id/members route] Matched with id=${req.params.id}`);
  getChannelMembers(req, res, next);
});

router.get("/", requireAuth, listChannels);
router.post("/", requireAuth, createChannel);
router.post("/:id/join", requireAuth, joinChannel);
router.post("/:id/leave", requireAuth, leaveChannel);
router.delete("/:id", requireAuth, deleteChannel);

router.post("/:id/join-request", requireAuth, requestJoinChannel);
router.post("/:id/approve-request", requireAuth, approveJoinRequest);
router.post("/:id/reject-request", requireAuth, rejectJoinRequest);
router.post("/:id/remove-member", requireAuth, removeMember);

export default router;
