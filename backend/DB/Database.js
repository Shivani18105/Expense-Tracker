import mongoose from "mongoose";

export const connectDB = async () => {
  const db = process.env.MONGO_URL;

  const { connection } = await mongoose.connect(db);

  console.log(`MongoDB Connected to ${connection.host}`);
};
