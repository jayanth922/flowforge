import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

export const connectMongo = async (): Promise<void> => {
  const uri = process.env["MONGODB_URI"];
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  mongoose.connection.on("connected", () => {
    logger.info("MongoDB connected");
  });

  mongoose.connection.on("error", (err: unknown) => {
    logger.error({ err }, "MongoDB connection error");
  });

  mongoose.connection.on("disconnected", () => {
    logger.info("MongoDB disconnected");
  });

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
};
