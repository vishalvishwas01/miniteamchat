import { verifyToken } from "../utils/jwt.js";

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return next();
  const parts = header.split(" ");
  if (parts.length !== 2) return next();
  const token = parts[1];
  const payload = verifyToken(token);
  if (payload && payload.userId) req.userId = payload.userId;
  return next();
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    console.error("[requireAuth] Missing Authorization header");
    return res.status(401).json({ error: "Missing Authorization header" });
  }
  const parts = header.split(" ");
  if (parts.length !== 2) {
    console.error("[requireAuth] Malformed Authorization header:", header);
    return res.status(401).json({ error: "Malformed Authorization header" });
  }

  const token = parts[1];
  const payload = verifyToken(token);
  if (!payload || !payload.userId) {
    console.error("[requireAuth] Invalid or expired token. Payload:", payload);
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.userId = payload.userId;
  return next();
}
