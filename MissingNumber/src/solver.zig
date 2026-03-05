const std = @import("std");
const testing = std.testing;

pub const SolverError = error{
    EmptyInput,
    InvalidInput,
    Overflow,
};

/// Finds the missing number in a sequential series.
/// Uses the arithmetic sum formula: expected_sum - actual_sum = missing_number.
///
/// The missing value must lie strictly *within* the observed [min, max] range.
/// If the missing value is at the boundary (before min or after max), it cannot
/// be detected from the data alone — the range would appear complete. This matches
/// the problem specification where all sample inputs have interior gaps.
///
/// Returns an error if:
/// - the input is empty
/// - the input contains duplicates or more/fewer than exactly one missing number
/// - the arithmetic overflows i64
pub fn findMissing(numbers: []const i64) SolverError!i64 {
    if (numbers.len == 0) return SolverError.EmptyInput;

    var min: i64 = numbers[0];
    var max: i64 = numbers[0];
    var actual_sum: i64 = 0;

    for (numbers) |n| {
        if (n < min) min = n;
        if (n > max) max = n;
        const sum_result = @addWithOverflow(actual_sum, n);
        if (sum_result[1] != 0) return SolverError.Overflow;
        actual_sum = sum_result[0];
    }

    // A range [min, max] with exactly one interior gap has (max - min) elements.
    const range_span = @subWithOverflow(max, min);
    if (range_span[1] != 0) return SolverError.Overflow;
    if (numbers.len != @as(usize, @intCast(range_span[0])))
        return SolverError.InvalidInput;

    // expected_sum = (max + min) * (max - min + 1) / 2
    const sum_endpoints = @addWithOverflow(max, min);
    if (sum_endpoints[1] != 0) return SolverError.Overflow;
    const range_count = @addWithOverflow(range_span[0], @as(i64, 1));
    if (range_count[1] != 0) return SolverError.Overflow;
    const product = @mulWithOverflow(sum_endpoints[0], range_count[0]);
    if (product[1] != 0) return SolverError.Overflow;

    // The product of (sum_endpoints * range_count) is always even for consecutive
    // integer ranges, so we can safely use @divExact here after validation.
    const expected_sum = @divExact(product[0], 2);

    const result = @subWithOverflow(expected_sum, actual_sum);
    if (result[1] != 0) return SolverError.Overflow;
    return result[0];
}

// --- Sample input tests (from problem statement) ---

test "findMissing: sample 1 — missing 11 from 1..12" {
    const nums = [_]i64{ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12 };
    try testing.expectEqual(@as(i64, 11), try findMissing(&nums));
}

test "findMissing: sample 2 — missing 25 from 24..29 (unordered)" {
    const nums = [_]i64{ 24, 26, 27, 29, 28 };
    try testing.expectEqual(@as(i64, 25), try findMissing(&nums));
}

test "findMissing: sample 3 — missing 3 from 1..5" {
    const nums = [_]i64{ 1, 2, 4, 5 };
    try testing.expectEqual(@as(i64, 3), try findMissing(&nums));
}

test "findMissing: sample 4 — missing 106 from 99..107" {
    const nums = [_]i64{ 99, 100, 101, 102, 103, 104, 105, 107 };
    try testing.expectEqual(@as(i64, 106), try findMissing(&nums));
}

test "findMissing: sample 5 — missing 113 from 105..118 (unordered)" {
    const nums = [_]i64{ 109, 105, 107, 108, 106, 110, 112, 111, 118, 116, 115, 114, 117 };
    try testing.expectEqual(@as(i64, 113), try findMissing(&nums));
}

// --- Boundary: gap near edges of range ---

test "findMissing: gap at second position" {
    const nums = [_]i64{ 1, 3, 4, 5, 6 };
    try testing.expectEqual(@as(i64, 2), try findMissing(&nums));
}

test "findMissing: gap at penultimate position" {
    const nums = [_]i64{ 1, 2, 3, 4, 6 };
    try testing.expectEqual(@as(i64, 5), try findMissing(&nums));
}

// --- Edge cases: contiguous range has no interior gap → InvalidInput ---

test "findMissing: contiguous range returns InvalidInput" {
    const nums = [_]i64{ 2, 3, 4, 5 };
    try testing.expectError(SolverError.InvalidInput, findMissing(&nums));
}

// --- Minimal series ---

test "findMissing: two-element series with interior gap" {
    const nums = [_]i64{ 1, 3 };
    try testing.expectEqual(@as(i64, 2), try findMissing(&nums));
}

test "findMissing: single element — returns InvalidInput (no gap possible)" {
    const nums = [_]i64{5};
    try testing.expectError(SolverError.InvalidInput, findMissing(&nums));
}

test "findMissing: empty slice returns EmptyInput" {
    const nums = [_]i64{};
    try testing.expectError(SolverError.EmptyInput, findMissing(&nums));
}

// --- Negative numbers ---

test "findMissing: negative range, missing middle" {
    const nums = [_]i64{ -5, -4, -3, -1 };
    try testing.expectEqual(@as(i64, -2), try findMissing(&nums));
}

test "findMissing: range spanning zero, missing zero" {
    const nums = [_]i64{ -2, -1, 1, 2 };
    try testing.expectEqual(@as(i64, 0), try findMissing(&nums));
}

test "findMissing: range spanning zero, missing negative" {
    const nums = [_]i64{ -3, -2, 0, 1 };
    try testing.expectEqual(@as(i64, -1), try findMissing(&nums));
}

test "findMissing: range spanning zero, missing positive" {
    const nums = [_]i64{ -1, 0, 2, 3 };
    try testing.expectEqual(@as(i64, 1), try findMissing(&nums));
}

test "findMissing: all-negative range, gap near start" {
    const nums = [_]i64{ -10, -8, -7, -6, -5 };
    try testing.expectEqual(@as(i64, -9), try findMissing(&nums));
}

test "findMissing: all-negative range, gap near end" {
    const nums = [_]i64{ -10, -9, -8, -7, -5 };
    try testing.expectEqual(@as(i64, -6), try findMissing(&nums));
}

// --- Large ranges ---

test "findMissing: 1000-element range, missing 500" {
    var nums: [999]i64 = undefined;
    var idx: usize = 0;
    var i: i64 = 1;
    while (i <= 1000) : (i += 1) {
        if (i == 500) continue;
        nums[idx] = i;
        idx += 1;
    }
    try testing.expectEqual(@as(i64, 500), try findMissing(&nums));
}

test "findMissing: 1000-element range, missing 2 (near start)" {
    var nums: [999]i64 = undefined;
    var idx: usize = 0;
    var i: i64 = 1;
    while (i <= 1000) : (i += 1) {
        if (i == 2) continue;
        nums[idx] = i;
        idx += 1;
    }
    try testing.expectEqual(@as(i64, 2), try findMissing(&nums));
}

test "findMissing: 1000-element range, missing 999 (near end)" {
    var nums: [999]i64 = undefined;
    var idx: usize = 0;
    var i: i64 = 1;
    while (i <= 1000) : (i += 1) {
        if (i == 999) continue;
        nums[idx] = i;
        idx += 1;
    }
    try testing.expectEqual(@as(i64, 999), try findMissing(&nums));
}

// --- Ordering shouldn't matter ---

test "findMissing: reverse-ordered input" {
    const nums = [_]i64{ 10, 9, 8, 7, 6, 4, 3, 2, 1 };
    try testing.expectEqual(@as(i64, 5), try findMissing(&nums));
}

test "findMissing: already sorted input" {
    const nums = [_]i64{ 1, 2, 3, 4, 6, 7, 8, 9, 10 };
    try testing.expectEqual(@as(i64, 5), try findMissing(&nums));
}

test "findMissing: scrambled input" {
    const nums = [_]i64{ 7, 2, 9, 4, 1, 8, 3, 10, 6 };
    try testing.expectEqual(@as(i64, 5), try findMissing(&nums));
}

// --- Validation: invalid inputs ---

test "findMissing: duplicate values returns InvalidInput" {
    const nums = [_]i64{ 1, 2, 2, 4 };
    try testing.expectError(SolverError.InvalidInput, findMissing(&nums));
}

test "findMissing: multiple missing numbers returns InvalidInput" {
    const nums = [_]i64{ 1, 4 };
    try testing.expectError(SolverError.InvalidInput, findMissing(&nums));
}

test "findMissing: all same values returns InvalidInput" {
    const nums = [_]i64{ 5, 5, 5 };
    try testing.expectError(SolverError.InvalidInput, findMissing(&nums));
}

// --- Overflow protection ---

test "findMissing: extreme i64 values return Overflow" {
    const nums = [_]i64{ std.math.minInt(i64), std.math.maxInt(i64) };
    try testing.expectError(SolverError.Overflow, findMissing(&nums));
}

// --- Negative-only edge cases ---

test "findMissing: contiguous negative range returns InvalidInput" {
    const nums = [_]i64{ -3, -2, -1, 0 };
    try testing.expectError(SolverError.InvalidInput, findMissing(&nums));
}

test "findMissing: single negative element returns InvalidInput" {
    const nums = [_]i64{-7};
    try testing.expectError(SolverError.InvalidInput, findMissing(&nums));
}

test "findMissing: two-element negative pair missing -1" {
    const nums = [_]i64{ -2, 0 };
    try testing.expectEqual(@as(i64, -1), try findMissing(&nums));
}

test "findMissing: contiguous range starting at zero returns InvalidInput" {
    const nums = [_]i64{ 0, 1, 2, 3 };
    try testing.expectError(SolverError.InvalidInput, findMissing(&nums));
}

// --- Overflow isolation: actual_sum overflow ---

test "findMissing: actual_sum overflow from many large positives" {
    // Construct a range near i64 max where summing the elements overflows.
    // Range: [maxInt - 4 .. maxInt] missing (maxInt - 2), i.e. 4 elements.
    // Sum of remaining ≈ 4 * maxInt which overflows i64.
    const max = std.math.maxInt(i64);
    const nums = [_]i64{ max - 4, max - 3, max - 1, max };
    try testing.expectError(SolverError.Overflow, findMissing(&nums));
}

// --- Overflow isolation: range_span overflow ---

test "findMissing: range_span overflow from extreme min/max spread" {
    // min = minInt, max = 0 → range_span = 0 - minInt overflows i64.
    const nums = [_]i64{ std.math.minInt(i64), 0 };
    try testing.expectError(SolverError.Overflow, findMissing(&nums));
}

// --- Parser integration: overflow at parse boundary ---

test "findMissing: i64 max value is a valid element" {
    // Two-element series: [maxInt - 2, maxInt] missing (maxInt - 1).
    // actual_sum = (maxInt - 2) + maxInt overflows, so we expect Overflow.
    const max = std.math.maxInt(i64);
    const nums = [_]i64{ max - 2, max };
    try testing.expectError(SolverError.Overflow, findMissing(&nums));
}
