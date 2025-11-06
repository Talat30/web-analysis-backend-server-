import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
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

// Root endpoint (API check)
app.get("/api", (req, res) => {
  res.send("✅ Web Analytics Collector API is running!");
});

// Event routes
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

// ✅ Serve frontend build
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.resolve(__dirname, "../web_analysis-main/frontend/dist");

app.use(express.static(frontendPath));

// All other routes -> frontend index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Something went wrong" });
});

// ✅ Use Render's assigned PORT
const PORT = process.env.PORT || 5001;
app.listen(PORT, () =>
  console.log(`🚀 Server listening at http://localhost:${PORT}`)
);
