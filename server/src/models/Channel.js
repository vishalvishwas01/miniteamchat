import mongoose from "mongoose";
const { Schema, model } = mongoose;

const ChannelSchema = new Schema(
  {
    name: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isPrivate: { type: Boolean, default: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    pendingRequests: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default model("Channel", ChannelSchema);
