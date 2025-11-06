import express from "express";
import cors from "cors";
import morgan from "morgan";
import eventRoutes from "./routes/events.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));

// In-memory analytics store
const analytics = {
  totalVisits: 0,
  pageVisits: {}, // { "/home": { count: 5, totalTime: 50 } }
};

// ✅ Root endpoint
app.get("/", (req, res) => {
  res.send("✅ Web Analytics Collector API is running!");
});

// ✅ Existing event routes (all under /api)
app.use("/api", eventRoutes);

// ✅ Track endpoint (for user time tracking)
app.post("/api/track", (req, res) => {
  const { page, timeSpent } = req.body;
  if (!page) {
    return res.status(400).json({ error: "Missing 'page'" });
  }

  analytics.totalVisits++;
  if (!analytics.pageVisits[page]) {
    analytics.pageVisits[page] = { count: 0, totalTime: 0 };
  }
  analytics.pageVisits[page].count++;
  analytics.pageVisits[page].totalTime += timeSpent || 0;

  res.json({ message: "Event tracked successfully" });
});

// ✅ Analytics endpoint (for frontend Analytics page)
app.get("/api/analytics", (req, res) => {
  try {
    res.json(analytics);
  } catch (error) {
    console.error("Error sending analytics:", error);
    res.status(500).json({ error: "Failed to load analytics data" });
  }
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Something went wrong" });
});

// ✅ Start server
const PORT = process.env.PORT || 10000; // Render auto-assigns port
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
