import express from "express";
import cors from "cors";
import morgan from "morgan";
import eventRoutes from "./routes/events.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));

// In-memory analytics store
const analytics = {
  totalVisits: 0,
  pageVisits: {}, // { "/home": { count: 5, totalTime: 50 } }
};

// Root endpoint
app.get("/", (req, res) => {
  res.send("✅ Web Analytics Collector API is running!");
});

// Existing event routes
app.use("/api", eventRoutes);

// Track endpoint
app.post("/api/track", (req, res) => {
  const { page, timeSpent } = req.body;
  if (!page) return res.status(400).json({ error: "Missing 'page'" });

  analytics.totalVisits++;
  if (!analytics.pageVisits[page]) {
    analytics.pageVisits[page] = { count: 0, totalTime: 0 };
  }
  analytics.pageVisits[page].count++;
  analytics.pageVisits[page].totalTime += timeSpent || 0;

  res.json({ message: "Event tracked successfully" });
});




// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Something went wrong" });
});

const PORT = process.env.PORT || 5001; // ✅ Change to 5001 to avoid conflict
app.listen(PORT, () =>
  console.log(`🚀 Server listening at http://localhost:${PORT}`)
);
