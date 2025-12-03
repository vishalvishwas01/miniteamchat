import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import authRoutes from "./routes/auth.routes.js";
import channelsRoutes from "./routes/channels.routes.js";
import messagesRoutes from "./routes/messages.routes.js";

const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true
  })
);

// Health-check
app.get("/health", (req, res) => res.json({ ok: true }));

// API
app.use("/api/auth", authRoutes);
app.use("/api/channels", channelsRoutes);
app.use("/api/messages", messagesRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

export default app;
