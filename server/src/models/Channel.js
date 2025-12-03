// server/src/models/Channel.js
import mongoose from "mongoose";
const { Schema, model } = mongoose;

const ChannelSchema = new Schema(
  {
    name: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isPrivate: { type: Boolean, default: true }, // private by default
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    pendingRequests: [{ type: Schema.Types.ObjectId, ref: "User" }],
    // ... other fields
  },
  { timestamps: true }
);

export default model("Channel", ChannelSchema);
