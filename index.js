import express from "express";
import cors from "cors";
import morgan from "morgan";
import eventRoutes from "./routes/events.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));

// ✅ Root endpoint
app.get("/", (req, res) => {
  res.send("✅ Web Analytics Collector API is running!");
});

// ✅ Use all API routes from routes/events.js
app.use("/", eventRoutes);


// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  res.status(500).json({ error: "Something went wrong" });
});

// ✅ Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
