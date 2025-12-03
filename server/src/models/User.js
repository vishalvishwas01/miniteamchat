import mongoose from "mongoose";

const { Schema, model } = mongoose;

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String }, // optional if using OAuth
    avatarUrl: { type: String },
    oauthProvider: { type: String }, // e.g. 'google', 'github'
    lastSeen: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default model("User", UserSchema);
