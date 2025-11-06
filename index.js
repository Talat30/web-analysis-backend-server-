import express from "express";
import cors from "cors";
import morgan from "morgan";
import eventRoutes from "./routes/events.js";

const app = express();

// ✅ Middleware
app.use(
  cors({
    origin: "*", // Allow all origins (safe for Render deployment)
    methods: ["GET", "POST"],
  })
);
app.use(express.json());
app.use(morgan("tiny"));

// ✅ Health check route (Render will use this)
app.get("/", (req, res) => {
  res.send("✅ Web Analytics Backend is running successfully!");
});

// ✅ Mount all routes from routes/events.js
// This will expose: /events, /analytics, /track, etc.
app.use("/", eventRoutes);

// ✅ Handle 404s for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Unhandled server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ✅ Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
