const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DB_URI, {
      maxPoolSize: 10, // keep up to 10 connections in pool
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1); // exit if cannot connect on startup
  }
};

// Mongoose event listeners (good for debugging in dev)
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB disconnected. Trying to reconnect...");
});

mongoose.connection.on("reconnected", () => {
  console.log("🔄 MongoDB reconnected");
});

module.exports = connectDB;