import mongoose from "mongoose";

export const connectMongo = async (): Promise<void> => {
  const uri = process.env["MONGODB_URI"];
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  mongoose.connection.on("connected", () => {
    console.log("[mongo] connected successfully");
  });

  mongoose.connection.on("error", (err) => {
    console.error("[mongo] connection error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    console.log("[mongo] disconnected");
  });

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
};
