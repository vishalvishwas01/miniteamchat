import mongoose from "mongoose";

export default async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/mini-chat";
  try {
    await mongoose.connect(uri, {
      // these options are not required in Mongoose 6+, but can be set if you prefer
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
  }
}
