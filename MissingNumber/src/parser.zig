const std = @import("std");
const testing = std.testing;

/// Parses a comma-delimited line of integers into a slice.
/// Caller owns the returned memory.
pub fn parseLine(allocator: std.mem.Allocator, line: []const u8) ![]i64 {
    var nums = std.ArrayList(i64).init(allocator);
    errdefer nums.deinit();

    var iter = std.mem.splitScalar(u8, line, ',');
    while (iter.next()) |token| {
        const trimmed = std.mem.trim(u8, token, &std.ascii.whitespace);
        if (trimmed.len == 0) continue;
        const num = try std.fmt.parseInt(i64, trimmed, 10);
        try nums.append(num);
    }

    return nums.toOwnedSlice();
}

// --- Happy path ---

test "parseLine: basic comma-delimited" {
    const result = try parseLine(testing.allocator, "10,20,30");
    defer testing.allocator.free(result);

    try testing.expectEqual(@as(usize, 3), result.len);
    try testing.expectEqual(@as(i64, 10), result[0]);
    try testing.expectEqual(@as(i64, 20), result[1]);
    try testing.expectEqual(@as(i64, 30), result[2]);
}

test "parseLine: single value" {
    const result = try parseLine(testing.allocator, "42");
    defer testing.allocator.free(result);

    try testing.expectEqual(@as(usize, 1), result.len);
    try testing.expectEqual(@as(i64, 42), result[0]);
}

test "parseLine: two values" {
    const result = try parseLine(testing.allocator, "1,3");
    defer testing.allocator.free(result);

    try testing.expectEqual(@as(usize, 2), result.len);
    try testing.expectEqual(@as(i64, 1), result[0]);
    try testing.expectEqual(@as(i64, 3), result[1]);
}

test "parseLine: negative numbers" {
    const result = try parseLine(testing.allocator, "-5,-3,-1");
    defer testing.allocator.free(result);

    try testing.expectEqual(@as(usize, 3), result.len);
    try testing.expectEqual(@as(i64, -5), result[0]);
    try testing.expectEqual(@as(i64, -3), result[1]);
    try testing.expectEqual(@as(i64, -1), result[2]);
}

test "parseLine: mixed positive and negative" {
    const result = try parseLine(testing.allocator, "-2,0,1,3");
    defer testing.allocator.free(result);

    try testing.expectEqual(@as(usize, 4), result.len);
    try testing.expectEqual(@as(i64, -2), result[0]);
    try testing.expectEqual(@as(i64, 0), result[1]);
    try testing.expectEqual(@as(i64, 1), result[2]);
    try testing.expectEqual(@as(i64, 3), result[3]);
}

test "parseLine: large numbers" {
    const result = try parseLine(testing.allocator, "1000000,2000000,3000000");
    defer testing.allocator.free(result);

    try testing.expectEqual(@as(usize, 3), result.len);
    try testing.expectEqual(@as(i64, 1000000), result[0]);
    try testing.expectEqual(@as(i64, 2000000), result[1]);
    try testing.expectEqual(@as(i64, 3000000), result[2]);
}

// --- Whitespace handling ---

test "parseLine: spaces around values" {
    const result = try parseLine(testing.allocator, " 5 , 10 , 15 ");
    defer testing.allocator.free(result);

    try testing.expectEqual(@as(usize, 3), result.len);
    try testing.expectEqual(@as(i64, 5), result[0]);
    try testing.expectEqual(@as(i64, 10), result[1]);
    try testing.expectEqual(@as(i64, 15), result[2]);
}

test "parseLine: tabs around values" {
    const result = try parseLine(testing.allocator, "\t7\t,\t14\t");
    defer testing.allocator.free(result);

    try testing.expectEqual(@as(usize, 2), result.len);
    try testing.expectEqual(@as(i64, 7), result[0]);
    try testing.expectEqual(@as(i64, 14), result[1]);
}

// --- Empty / degenerate input ---

test "parseLine: empty string" {
    const result = try parseLine(testing.allocator, "");
    defer testing.allocator.free(result);

    try testing.expectEqual(@as(usize, 0), result.len);
}

test "parseLine: only whitespace" {
    const result = try parseLine(testing.allocator, "   ");
    defer testing.allocator.free(result);

    try testing.expectEqual(@as(usize, 0), result.len);
}

test "parseLine: trailing comma produces empty token (skipped)" {
    const result = try parseLine(testing.allocator, "1,2,3,");
    defer testing.allocator.free(result);

    try testing.expectEqual(@as(usize, 3), result.len);
    try testing.expectEqual(@as(i64, 1), result[0]);
    try testing.expectEqual(@as(i64, 2), result[1]);
    try testing.expectEqual(@as(i64, 3), result[2]);
}

test "parseLine: leading comma produces empty token (skipped)" {
    const result = try parseLine(testing.allocator, ",1,2,3");
    defer testing.allocator.free(result);

    try testing.expectEqual(@as(usize, 3), result.len);
    try testing.expectEqual(@as(i64, 1), result[0]);
    try testing.expectEqual(@as(i64, 2), result[1]);
    try testing.expectEqual(@as(i64, 3), result[2]);
}

// --- Error paths ---

test "parseLine: non-numeric input returns error" {
    const result = parseLine(testing.allocator, "1,abc,3");
    try testing.expectError(error.InvalidCharacter, result);
}

test "parseLine: float input returns error" {
    const result = parseLine(testing.allocator, "1,2.5,3");
    try testing.expectError(error.InvalidCharacter, result);
}

// --- Boundary values ---

test "parseLine: i64 max value parses successfully" {
    const result = try parseLine(testing.allocator, "9223372036854775807");
    defer testing.allocator.free(result);

    try testing.expectEqual(@as(usize, 1), result.len);
    try testing.expectEqual(@as(i64, 9223372036854775807), result[0]);
}

test "parseLine: i64 max + 1 returns Overflow" {
    const result = parseLine(testing.allocator, "9223372036854775808");
    try testing.expectError(error.Overflow, result);
}

// --- Degenerate delimiters ---

test "parseLine: multiple consecutive commas are skipped" {
    const result = try parseLine(testing.allocator, "1,,,,2");
    defer testing.allocator.free(result);

    try testing.expectEqual(@as(usize, 2), result.len);
    try testing.expectEqual(@as(i64, 1), result[0]);
    try testing.expectEqual(@as(i64, 2), result[1]);
}

// --- Leading zeros ---

test "parseLine: leading zeros parse correctly" {
    const result = try parseLine(testing.allocator, "01,002,3");
    defer testing.allocator.free(result);

    try testing.expectEqual(@as(usize, 3), result.len);
    try testing.expectEqual(@as(i64, 1), result[0]);
    try testing.expectEqual(@as(i64, 2), result[1]);
    try testing.expectEqual(@as(i64, 3), result[2]);
}

// --- Plus sign prefix ---

test "parseLine: plus sign on positive number parses successfully" {
    const result = try parseLine(testing.allocator, "+5,6,8");
    defer testing.allocator.free(result);

    try testing.expectEqual(@as(usize, 3), result.len);
    try testing.expectEqual(@as(i64, 5), result[0]);
    try testing.expectEqual(@as(i64, 6), result[1]);
    try testing.expectEqual(@as(i64, 8), result[2]);
}

// --- Negative zero ---

test "parseLine: negative zero parses as zero" {
    const result = try parseLine(testing.allocator, "-0,1,3");
    defer testing.allocator.free(result);

    try testing.expectEqual(@as(usize, 3), result.len);
    try testing.expectEqual(@as(i64, 0), result[0]);
    try testing.expectEqual(@as(i64, 1), result[1]);
    try testing.expectEqual(@as(i64, 3), result[2]);
}
