// server/db.js
import sqlite3 from "sqlite3";
sqlite3.verbose();

// ✅ Initialize database connection
const db = new sqlite3.Database("./events.db", (err) => {
  if (err) console.error("❌ Database connection failed:", err.message);
  else console.log("✅ Connected to SQLite database.");
});

// ✅ Create table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    data TEXT,
    user TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ✅ Insert new tracking event
export const insertEvent = (type, data, user = "anonymous") => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO events (type, data, user) VALUES (?, ?, ?)",
      [type, JSON.stringify(data), user],
      function (err) {
        if (err) {
          console.error("❌ Error inserting event:", err.message);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
};

// ✅ Fetch *all events* for analytics processing
export const getStats = () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT type, data, timestamp FROM events ORDER BY id DESC", [], (err, rows) => {
      if (err) {
        console.error("❌ Error fetching stats:", err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// ✅ Fetch recent events for activity logs
export const getRecentEvents = (limit = 10) => {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM events ORDER BY timestamp DESC LIMIT ?",
      [limit],
      (err, rows) => {
        if (err) {
          console.error("❌ Error fetching recent events:", err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
};

// ✅ Export db instance (optional for debugging)
export default db;
