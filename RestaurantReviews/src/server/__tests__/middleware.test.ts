import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { errorHandler } from "../middleware/error-handler.js";

// ── Error Handler ───────────────────────────────────────────────────

describe("errorHandler", () => {
  function appWithError(err: Error) {
    const app = express();
    app.get("/boom", (_req, _res, _next) => {
      throw err;
    });
    app.use(errorHandler);
    return app;
  }

  it("returns 500 with generic message", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = appWithError(new Error("db crashed"));

    const res = await request(app).get("/boom");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
    spy.mockRestore();
  });

  it("does not leak error details to client", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = appWithError(new Error("secret db password in stack"));

    const res = await request(app).get("/boom");

    expect(res.body.error).toBe("Internal server error");
    expect(JSON.stringify(res.body)).not.toContain("secret");
    spy.mockRestore();
  });

  it("logs the error stack to console.error", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("something broke");
    const app = appWithError(err);

    await request(app).get("/boom");

    expect(spy).toHaveBeenCalledWith(err.stack);
    spy.mockRestore();
  });

  it("handles errors passed via next()", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = express();
    app.get("/async-boom", (_req, _res, next) => {
      next(new Error("async error"));
    });
    app.use(errorHandler);

    const res = await request(app).get("/async-boom");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
    spy.mockRestore();
  });
});

// ── Rate Limiter (smoke test) ───────────────────────────────────────

describe("rate limiting", () => {
  it("returns rate limit headers", async () => {
    const Database = (await import("better-sqlite3")).default;
    const { createApp } = await import("../app.js");
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    const app = createApp(db);

    const res = await request(app).get("/api/restaurants");

    // Check for any rate-limit related header (case-insensitive in supertest)
    const headerKeys = Object.keys(res.headers);
    const hasRateLimitHeader = headerKeys.some(
      (k) => k.toLowerCase().includes("ratelimit") || k.toLowerCase().includes("rate-limit")
    );
    expect(hasRateLimitHeader).toBe(true);
  });

  it("returns 429 after exceeding exercise rate limit (30 req/min)", async () => {
    const Database = (await import("better-sqlite3")).default;
    const { createApp } = await import("../app.js");
    const db = new Database(":memory:");
    const app = createApp(db);

    // The exercise limiter allows 30 requests per minute window.
    // Fire 31 requests; the 31st should be rate-limited.
    const agent = request(app);
    const results = [];
    for (let i = 0; i < 31; i++) {
      results.push(
        agent
          .post("/api/exercises/cash-register")
          .send({ input: "1.00,2.00\n" })
      );
    }
    const responses = await Promise.all(results);
    const statuses = responses.map((r) => r.status);
    expect(statuses.filter((s) => s === 429).length).toBeGreaterThanOrEqual(1);
  });
});
