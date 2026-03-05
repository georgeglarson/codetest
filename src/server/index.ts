import path from "path";
import express from "express";
import morgan from "morgan";
import { createDb, setDb } from "./db/connection.js";
import { createApp } from "./app.js";
import { startCleanupTimer } from "./exercises/gilded-rose.js";

const PORT = Number(process.env.PORT) || 3000;
const DB_PATH = process.env.DB_PATH || "restaurant-reviews.db";

const db = createDb(DB_PATH);
setDb(db);

const app = createApp(db);

app.use(morgan("[:date[iso]] :remote-addr :method :url :status :response-time[0]ms"));

// Serve static client build in production
const clientDist = path.resolve(import.meta.dirname, "../../dist/client");
app.use(express.static(clientDist));
app.get("*", (_req, res, next) => {
  // Only serve index.html for non-API routes
  if (_req.path.startsWith("/api")) return next();
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

startCleanupTimer().unref();
