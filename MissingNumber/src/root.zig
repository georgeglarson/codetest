const std = @import("std");
const testing = std.testing;

pub const solver = @import("solver.zig");
pub const parser = @import("parser.zig");

pub const ProcessError = error{
    EmptyInput,
    InvalidInput,
    Overflow,
    InvalidCharacter,
    OutOfMemory,
};

/// Processes an entire input buffer, returning the missing number for each line.
/// Caller owns the returned memory.
pub fn processInput(allocator: std.mem.Allocator, input: []const u8) ProcessError![]i64 {
    var results = std.ArrayList(i64).init(allocator);
    errdefer results.deinit();

    var lines = std.mem.splitScalar(u8, input, '\n');
    while (lines.next()) |line| {
        const trimmed = std.mem.trim(u8, line, &std.ascii.whitespace);
        if (trimmed.len == 0) continue;

        const numbers = try parser.parseLine(allocator, trimmed);
        defer allocator.free(numbers);

        try results.append(try solver.findMissing(numbers));
    }

    return results.toOwnedSlice();
}

// --- Integration: full pipeline tests ---

test "processInput: full sample from problem statement" {
    const input =
        \\1,2,3,4,5,6,7,8,9,10,12
        \\24,26,27,29,28
        \\1,2,4,5
        \\99,100,101,102,103,104,105,107
        \\109,105,107,108,106,110,112,111,118,116,115,114,117
    ;
    const results = try processInput(testing.allocator, input);
    defer testing.allocator.free(results);

    const expected = [_]i64{ 11, 25, 3, 106, 113 };
    try testing.expectEqual(@as(usize, expected.len), results.len);
    for (expected, 0..) |exp, i| {
        try testing.expectEqual(exp, results[i]);
    }
}

test "processInput: single line" {
    const results = try processInput(testing.allocator, "1,2,4,5");
    defer testing.allocator.free(results);

    try testing.expectEqual(@as(usize, 1), results.len);
    try testing.expectEqual(@as(i64, 3), results[0]);
}

test "processInput: empty input" {
    const results = try processInput(testing.allocator, "");
    defer testing.allocator.free(results);

    try testing.expectEqual(@as(usize, 0), results.len);
}

test "processInput: blank lines are skipped" {
    const input =
        \\1,2,4,5
        \\
        \\10,11,13,14
    ;
    const results = try processInput(testing.allocator, input);
    defer testing.allocator.free(results);

    try testing.expectEqual(@as(usize, 2), results.len);
    try testing.expectEqual(@as(i64, 3), results[0]);
    try testing.expectEqual(@as(i64, 12), results[1]);
}

test "processInput: lines with negative numbers" {
    const results = try processInput(testing.allocator, "-5,-4,-3,-1");
    defer testing.allocator.free(results);

    try testing.expectEqual(@as(usize, 1), results.len);
    try testing.expectEqual(@as(i64, -2), results[0]);
}

test "processInput: propagates parse errors" {
    const result = processInput(testing.allocator, "1,2,abc,4");
    try testing.expectError(error.InvalidCharacter, result);
}

test "processInput: trailing newline doesn't produce extra result" {
    const input = "1,2,4,5\n";
    const results = try processInput(testing.allocator, input);
    defer testing.allocator.free(results);

    try testing.expectEqual(@as(usize, 1), results.len);
    try testing.expectEqual(@as(i64, 3), results[0]);
}

test "processInput: windows-style line endings (CRLF)" {
    const input = "1,2,4,5\r\n10,11,13,14\r\n";
    const results = try processInput(testing.allocator, input);
    defer testing.allocator.free(results);

    try testing.expectEqual(@as(usize, 2), results.len);
    try testing.expectEqual(@as(i64, 3), results[0]);
    try testing.expectEqual(@as(i64, 12), results[1]);
}

test "processInput: line with only commas returns EmptyInput" {
    const result = processInput(testing.allocator, ",,,");
    try testing.expectError(error.EmptyInput, result);
}

test "processInput: duplicate values returns InvalidInput" {
    const result = processInput(testing.allocator, "1,2,2,4");
    try testing.expectError(error.InvalidInput, result);
}

test "processInput: multiple missing returns InvalidInput" {
    const result = processInput(testing.allocator, "1,5");
    try testing.expectError(error.InvalidInput, result);
}

// --- Multi-line error propagation ---

test "processInput: error on second line propagates (first line valid)" {
    const input =
        \\1,2,4,5
        \\abc,def
    ;
    const result = processInput(testing.allocator, input);
    try testing.expectError(error.InvalidCharacter, result);
}

test "processInput: solver error on second line propagates (first line valid)" {
    const input =
        \\1,2,4,5
        \\7
    ;
    const result = processInput(testing.allocator, input);
    try testing.expectError(error.InvalidInput, result);
}

// --- Single-number line at integration level ---

test "processInput: single number line returns InvalidInput" {
    const result = processInput(testing.allocator, "42");
    try testing.expectError(error.InvalidInput, result);
}

// --- All-blank input ---

test "processInput: all-blank input returns empty results" {
    const results = try processInput(testing.allocator, "\n\n\n");
    defer testing.allocator.free(results);

    try testing.expectEqual(@as(usize, 0), results.len);
}

// Pull in tests from submodules so `zig build test` runs them all.
test "submodule tests" {
    _ = solver;
    _ = parser;
}
