import http from "http";
import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectDB from "./config/db.js";
import { initSocket } from "./sockets/index.js";

const PORT = process.env.PORT || 4000;

async function start() {
  await connectDB();

  const server = http.createServer(app);

  // initialize socket.io and pass the HTTP server
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`Server listening on port http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
