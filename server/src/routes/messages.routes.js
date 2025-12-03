import express from "express";
import {
  createMessage,
  listMessages,
  editMessage,
  deleteMessage
} from "../controllers/messageController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", listMessages);
router.post("/", requireAuth, createMessage);
router.patch("/:id", requireAuth, editMessage);
router.delete("/:id", requireAuth, deleteMessage);

export default router;
