import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { signToken } from "../utils/jwt.js";

export async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Missing fields" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({ name, email, passwordHash });
    const token = signToken({ userId: user._id });

    console.log("[signup] Created user:", user._id, "token:", token);

    res.json({
      ok: true,
      user: { id: user._id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
      token
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Missing fields" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    if (!user.passwordHash) return res.status(400).json({ error: "Account uses OAuth login" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken({ userId: user._id });
    console.log("[login] Authenticated user:", user._id, "token:", token);
    
    res.json({
      ok: true,
      user: { id: user._id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
      token
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await User.findById(userId).select("-passwordHash");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ ok: true, user });
  } catch (err) {
    next(err);
  }
}
