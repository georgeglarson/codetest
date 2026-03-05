# MissingNumber

A Zig solution for finding the missing number in sequential series.

## Approach

Uses the **arithmetic sum formula**: the expected sum of a contiguous range `[min, max]` is `(max + min) * (max - min + 1) / 2`. Subtracting the actual sum of the provided numbers gives the missing value in O(n) time with O(1) extra space.

The solution is structured as a library (`root.zig`) with a thin CLI driver (`main.zig`), making the core logic reusable and independently testable.

## Build & Run

```sh
# requires zig 0.14+
make run
```

## Test

```sh
make test
```

53 tests across three modules (solver, parser, orchestration) covering happy paths, edge cases, error paths, negative numbers, large ranges, input format variations, overflow detection, duplicate detection, and input validation.

## Design Considerations

- **Library separation**: Core logic is decoupled from I/O, enabling integration into larger systems or alternative frontends.
- **Allocator-driven**: All allocations go through Zig's allocator interface, giving callers full control over memory strategy.
- **Extensibility**: `parseLine` and `findMissing` are independent. The parser could be swapped for streaming input, and the algorithm could be extended to handle multiple missing values.
