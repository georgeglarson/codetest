# Cash Register

A command-line tool that calculates change denominations for cashiers. Written in Rust.

## Quick Start

```bash
cargo build
cargo run -- sample_input.txt
cargo test
```

## Usage

```
cash-register <input-file> [--divisor N] [--seed N] [--currency USD|EUR] [--verbose]
```

**Input file**: Each line contains `owed,paid` as dollar amounts (e.g., `2.13,3.00`). Blank lines are skipped.

**Output**: One line per transaction showing the change denominations.

```bash
$ cargo run -- sample_input.txt --verbose
Owed $2.12, Paid $3.00 -> 3 quarters,1 dime,3 pennies
Owed $1.97, Paid $2.00 -> 3 pennies
Owed $3.33, Paid $5.00 -> 5 quarters,5 nickels,17 pennies (random)

$ cargo run -- sample_edge_cases.txt --divisor 0 --verbose
Owed $5.00, Paid $5.00 -> no change
Owed $0.01, Paid $1.00 -> 3 quarters,2 dimes,4 pennies
Owed $100.00, Paid $200.00 -> 100 dollars
Owed $1.97, Paid $2.00 -> 3 pennies
Owed $3.00, Paid $5.00 -> 2 dollars
Owed $0.75, Paid $1.00 -> 1 quarter

$ cargo run -- sample_eur.txt --currency EUR --verbose
Owed €1.50, Paid €2.00 -> 1 20 cent coin,2 10 cent coins,2 5 cent coins (random)
Owed €3.33, Paid €5.00 -> 1 50 cent coin,1 10 cent coin,7 5 cent coins (random)
Owed €0.37, Paid €1.00 -> 1 50 cent coin,1 10 cent coin,1 2 cent coin,1 1 cent coin
Owed €7.77, Paid €10.00 -> 1 2 euro coin,1 20 cent coin,1 2 cent coin,1 1 cent coin (random)
```

Without `--verbose`, output matches the spec format exactly (`3 quarters,1 dime,3 pennies`).

### Flags

- `--divisor N` changes which transactions get randomized denominations (default: 3). If `owed` in cents is divisible by N, the change is randomized. Use `--divisor 0` to disable randomization entirely.
- `--seed N` seeds the random number generator for reproducible output. Useful for testing.
- `--currency USD|EUR` selects the currency denomination set (default: USD).
- `--verbose` shows transaction context alongside the change output. Labels random lines.

## The Problem

[Original problem statement from TrueFit](https://github.com/TrueFit/CashRegister): given a flat file of `owed,paid` pairs, output change denominations. When the owed amount is divisible by 3, randomize the denominations instead of minimizing them.

## Design Decisions

### Integer cents everywhere

All money is represented as `u32` cents. The string `"2.13"` is parsed via string manipulation into `213u32`, with no floating-point arithmetic anywhere. This eliminates an entire class of rounding bugs (e.g., `0.1 + 0.2 != 0.3` in IEEE 754).

### Strategy trait with concrete types

A `ChangeStrategy` trait defines the contract. `GreedyStrategy` minimizes denomination count; `RandomStrategy` randomizes it. The `rules` module decides which strategy to use based on transaction properties. Each piece has a single responsibility:

- Algorithms don't know about business rules
- Rules don't know about algorithm internals
- Adding either doesn't require changing the other

### Injectable randomness

`RandomStrategy<R: Rng>` is generic over its RNG source. Tests inject `StdRng::seed_from_u64()` for deterministic assertions. Production uses `StdRng::from_entropy()`. Zero-cost abstraction via monomorphization, no `Box<dyn Rng>`.

### No heavy dependencies

CLI argument parsing is a 5-line generic function, not a 50KB dependency. The only runtime dependencies are `thiserror` (structured errors) and `rand` (randomization), both well-established, minimal crates.

### Property-based testing

Unit tests verify specific cases. Property tests (`proptest`) verify invariants across thousands of random inputs: the random algorithm always sums to the target amount, only uses valid denominations, and never includes zero-count entries.

## Architecture

```
src/
  main.rs         CLI wiring: arg parsing, file I/O, exit codes
  lib.rs          Module re-exports
  error.rs        Error types with line numbers (thiserror)
  currency.rs     Denomination definitions (USD, EUR configs)
  parse.rs        String → cents conversion, line → Transaction
  strategy/
    mod.rs        ChangeStrategy trait, Breakdown type alias
    greedy.rs     Minimum denomination count algorithm
    random.rs     Randomized denomination algorithm
  rules.rs        Strategy dispatch: divisor check → greedy or random
  format.rs       Breakdown → output string (pluralization, joining)
tests/
  integration.rs  End-to-end binary tests
  proptest.rs     Property-based correctness tests
```

## Things to Consider

> What might happen if the client needs to change the random divisor?

Pass `--divisor N` at the command line. The divisor flows through `rules::make_change_for` as a parameter, so no code changes are needed. Setting `--divisor 0` disables randomization entirely.

> What might happen if the client needs to add another special case (like the random twist)?

Add a new strategy struct implementing `ChangeStrategy` (one file), then add a branch in `rules.rs`. Existing strategies and tests are untouched. For example, a "round up to nearest quarter" strategy would be ~20 lines of code and one new match arm.

> What might happen if sales closes a new client in France?

Pass `--currency EUR`. The EUR denomination table is already defined and wired into the CLI. Try it: `cargo run -- sample_eur.txt --currency EUR`. The denomination table drives all formatting (singular/plural names, values, everything). One caveat: France uses commas as decimal separators (`2,13` not `2.13`), which conflicts with the comma-delimited input format. A real deployment would need a configurable delimiter or a different input format (e.g., TSV, JSON).

## Testing

```bash
cargo test                    # All 79 tests: unit + integration + property-based
cargo test --lib              # Unit tests only (53 tests)
cargo test --test integration # Integration tests only (18 tests)
cargo test --test proptest    # Property-based tests only (8 tests)
```
