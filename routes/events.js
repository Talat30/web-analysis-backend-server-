import express from "express";
import { insertEvent, getRecentEvents } from "../db.js";

const router = express.Router();

/* -------------------------------------------------------------------------- */
/* POST /api/events — Collect tracking events                                  */
/* -------------------------------------------------------------------------- */
router.post("/events", async (req, res) => {
  try {
    const { type, details, page, timestamp, referrer, user } = req.body;
    if (!type) return res.status(400).json({ error: "Missing event type" });

    const eventData = {
      details: details || {},
      page: page || details?.page || details?.url || null,
      referrer: referrer || null,
      timestamp: timestamp || new Date().toISOString(),
    };

    const id = await insertEvent(type, eventData, user || "anonymous");
    res.json({ success: true, id });
  } catch (err) {
    console.error("❌ Error collecting event:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* -------------------------------------------------------------------------- */
/* GET /api/stats — Legacy overview                                            */
/* -------------------------------------------------------------------------- */
router.get("/stats", async (req, res) => {
  try {
    const rows = await getRecentEvents(1000);

    const analytics = {
      total_events: rows.length,
      page_views: 0,
      clicks: 0,
      avg_time_on_page: 0,
      most_viewed_pages: {},
    };

    let totalDuration = 0;
    let timeEvents = 0;

    rows.forEach((r) => {
      let d = {};
      try {
        d = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
      } catch {
        d = {};
      }

      const page = d.page || d.url || r.page || "unknown";

      if (r.type === "page_view") {
        analytics.page_views++;
        analytics.most_viewed_pages[page] =
          (analytics.most_viewed_pages[page] || 0) + 1;
      } else if (r.type === "click") {
        analytics.clicks++;
      } else if (r.type === "time_on_page") {
        // unify duration extraction
        const raw = d.duration ?? d.time ?? d.timeSpent ?? d.details?.duration;
        if (raw != null && !isNaN(Number(raw))) {
          const n = Number(raw);
          // If looks like ms (large number), convert to seconds
          const secs = n > 10000 ? n / 1000 : n;
          totalDuration += secs;
          timeEvents++;
        }
      }
    });

    analytics.avg_time_on_page = timeEvents
      ? (totalDuration / timeEvents).toFixed(2)
      : 0;

    res.json(analytics);
  } catch (err) {
    console.error("❌ Error fetching stats:", err);
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/* POST /api/track — Direct endpoint for page timing                           */
/* -------------------------------------------------------------------------- */
router.post("/track", async (req, res) => {
  try {
    // accept both { page, duration } and { page, timeSpent } from different frontends
    const { page } = req.body;
    const rawDuration =
      req.body.duration ?? req.body.timeSpent ?? req.body.time ?? req.body.details?.duration;

    if (!page || rawDuration == null)
      return res.status(400).json({ error: "Missing page or duration" });

    let duration = Number(rawDuration);
    if (isNaN(duration)) return res.status(400).json({ error: "Invalid duration" });

    // If duration seems to be in milliseconds (large number), convert to seconds
    if (duration > 10000) duration = duration / 1000;

    const eventData = {
      page,
      duration, // seconds
      timestamp: new Date().toISOString(),
    };

    await insertEvent("time_on_page", eventData, "anonymous");
    console.log(`⏱️ Tracked ${duration}s on ${page}`);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error tracking time:", err);
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/* GET /api/analytics — Detailed page-level analytics                          */
/* -------------------------------------------------------------------------- */
router.get("/analytics", async (req, res) => {
  try {
    const rows = await getRecentEvents(2000);
    const stats = {};

    const allowedPages = ["/", "/products", "/about"];

    for (const r of rows) {
      let d = {};
      try {
        d = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
      } catch {
        d = {};
      }

      const p = d.page || d.url || r.page || d.path || "unknown";

      // Skip pages not in the allowed list (including /analytics)
      if (!allowedPages.includes(p)) continue;

      if (!stats[p]) stats[p] = { views: 0, totalTime: 0 };

      if (r.type === "page_view") stats[p].views++;
      if (r.type === "time_on_page") {
        // accept several possible keys for duration
        const raw = d.duration ?? d.time ?? d.timeSpent ?? d.details?.duration;
        if (raw != null && !isNaN(Number(raw))) {
          let n = Number(raw);
          if (n > 10000) n = n / 1000; // ms -> s
          stats[p].totalTime += n; // accumulate seconds
        }
      }
    }

    const result = Object.entries(stats).map(([page, s]) => ({
      page,
      views: s.views,
      // avgTime in seconds (string for consistent JSON)
      avgTime: s.views > 0 ? (s.totalTime / s.views).toFixed(1) : "0.0",
    }));

    // sort by views for mostVisited
    result.sort((a, b) => b.views - a.views);
    const mostVisited = result[0] || null;

    // top pages by avgTime (descending)
    const topPages = [...result].sort((a, b) => Number(b.avgTime) - Number(a.avgTime)).slice(0, 5);

    res.json({
      totalPages: result.length,
      mostVisited,
      topPages,
    });
  } catch (err) {
    console.error("❌ Error computing analytics:", err);
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/* GET /api/time-series — Time-series analytics per page                       */
/* -------------------------------------------------------------------------- */
router.get("/time-series", async (req, res) => {
  try {
    const rows = await getRecentEvents(5000);
    const timeSeries = {};
    const allowedPages = ["/", "/products", "/about"];

    rows.forEach((r) => {
      let d = {};
      try {
        d = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
      } catch {
        d = {};
      }

      const p = d.page || d.url || r.page || d.path || "unknown";
      if (!allowedPages.includes(p)) return;

      const timestamp = new Date(r.timestamp);
      const hour = timestamp.getHours();
      const date = timestamp.toISOString().split('T')[0];
      const key = `${date}-${hour}`;

      if (!timeSeries[p]) timeSeries[p] = {};
      if (!timeSeries[p][key]) timeSeries[p][key] = { visits: 0, totalTime: 0 };

      if (r.type === "page_view") timeSeries[p][key].visits++;
      if (r.type === "time_on_page") {
        const raw = d.duration ?? d.time ?? d.timeSpent ?? d.details?.duration;
        if (raw != null && !isNaN(Number(raw))) {
          let n = Number(raw);
          if (n > 10000) n = n / 1000;
          timeSeries[p][key].totalTime += n;
        }
      }
    });

    const result = {};
    for (const page in timeSeries) {
      result[page] = Object.entries(timeSeries[page]).map(([time, data]) => ({
        time,
        visits: data.visits,
        totalTime: data.totalTime,
      })).sort((a, b) => a.time.localeCompare(b.time));
    }

    res.json(result);
  } catch (err) {
    console.error("❌ Error fetching time-series:", err);
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/* GET /api/recent — Get most recent 10 events                                 */
/* -------------------------------------------------------------------------- */
router.get("/recent", async (req, res) => {
  try {
    const events = await getRecentEvents(10);
    res.json(events);
  } catch (err) {
    console.error("❌ Error fetching recent events:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
