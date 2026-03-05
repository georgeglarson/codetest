import { describe, it, expect, vi } from "vitest";
import { parseId, requireStrings } from "../routes/validate.js";
import type { Request, Response } from "express";

// ── Helpers ──────────────────────────────────────────────────────────

function mockReq(id: string): Request {
  return { params: { id } } as unknown as Request;
}

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

// ── parseId ──────────────────────────────────────────────────────────

describe("parseId", () => {
  it("returns a number for a valid integer string", () => {
    const res = mockRes();
    const result = parseId(mockReq("42"), res, "thing");
    expect(result).toBe(42);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 0 for '0' (parseId does not reject zero)", () => {
    // parseId only checks isNaN — 0 is a valid number, so it passes through.
    // Whether zero is a valid entity id depends on the database layer, not parseId.
    const res = mockRes();
    const result = parseId(mockReq("0"), res, "thing");
    expect(result).toBe(0);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns -1 for '-1' (parseId does not reject negatives)", () => {
    // parseId only guards against NaN; route handlers or the DB reject invalid ids.
    const res = mockRes();
    const result = parseId(mockReq("-1"), res, "thing");
    expect(result).toBe(-1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 3.5 for '3.5' (parseId does not reject floats)", () => {
    // Number("3.5") is not NaN, so parseId returns it.
    const res = mockRes();
    const result = parseId(mockReq("3.5"), res, "thing");
    expect(result).toBe(3.5);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 400 for 'abc'", () => {
    const res = mockRes();
    const result = parseId(mockReq("abc"), res, "widget");
    expect(result).toBeNull();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "invalid widget id" });
  });

  it("handles a very large number without error", () => {
    const res = mockRes();
    const result = parseId(mockReq("999999999999999"), res, "thing");
    expect(result).toBe(999999999999999);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 400 for empty string", () => {
    const res = mockRes();
    // Number("") === 0, which is NOT NaN, so parseId returns 0
    const result = parseId(mockReq(""), res, "thing");
    expect(result).toBe(0);
  });

  it("returns 400 for whitespace-only string", () => {
    // Number("  ") === 0, not NaN
    const res = mockRes();
    const result = parseId(mockReq("  "), res, "thing");
    expect(result).toBe(0);
  });

  it("returns 400 for 'NaN'", () => {
    const res = mockRes();
    const result = parseId(mockReq("NaN"), res, "thing");
    expect(result).toBeNull();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 for 'Infinity'", () => {
    // Number("Infinity") is Infinity, not NaN — parseId returns it
    const res = mockRes();
    const result = parseId(mockReq("Infinity"), res, "thing");
    expect(result).toBe(Infinity);
  });
});

// ── requireStrings ───────────────────────────────────────────────────

describe("requireStrings", () => {
  it("returns trimmed values for valid strings", () => {
    const res = mockRes();
    const result = requireStrings(res, { name: "  Alice  ", email: "  a@b.com  " });
    expect(result).toEqual({ name: "Alice", email: "a@b.com" });
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 400 when a field is empty string after trim", () => {
    const res = mockRes();
    const result = requireStrings(res, { name: "   " });
    expect(result).toBeNull();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "name must not be blank" });
  });

  it("returns 400 when a field is a number (non-string)", () => {
    const res = mockRes();
    const result = requireStrings(res, { name: 42 as unknown });
    expect(result).toBeNull();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "name must be strings" });
  });

  it("returns 400 when a field is null", () => {
    const res = mockRes();
    const result = requireStrings(res, { name: null as unknown });
    expect(result).toBeNull();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "name are required" });
  });

  it("returns 400 when a field is undefined", () => {
    const res = mockRes();
    const result = requireStrings(res, { name: undefined as unknown });
    expect(result).toBeNull();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when a field is an empty string (pre-trim check)", () => {
    const res = mockRes();
    const result = requireStrings(res, { name: "" });
    expect(result).toBeNull();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "name are required" });
  });

  it("returns 400 for boolean field", () => {
    const res = mockRes();
    const result = requireStrings(res, { name: true as unknown });
    expect(result).toBeNull();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("error message lists all field names", () => {
    const res = mockRes();
    requireStrings(res, { name: null as unknown, email: "ok" });
    expect(res.json).toHaveBeenCalledWith({ error: "name and email are required" });
  });
});
