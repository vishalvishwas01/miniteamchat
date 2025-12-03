import mongoose from "mongoose";

const { Schema, model } = mongoose;

const MessageSchema = new Schema(
  {
    channelId: { type: Schema.Types.ObjectId, ref: "Channel", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" },
    attachments: [
      {
        url: String,
        filename: String,
        mimeType: String
      }
    ],
    clientId: { type: String, default: null }, // optional client-provided temporary id
    editedAt: Date,
    deleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

MessageSchema.index({ channelId: 1, createdAt: -1 });

export default model("Message", MessageSchema);
