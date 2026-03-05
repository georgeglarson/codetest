# TrueFit Code Exercises

[![CI](https://github.com/georgeglarson/truefit/actions/workflows/ci.yml/badge.svg)](https://github.com/georgeglarson/truefit/actions/workflows/ci.yml)

**[Live Demo](https://truefit.georgelarson.me)** | Solutions to TrueFit's coding challenges. Each exercise is implemented in a different language, chosen to match the problem domain.

## Exercises

| Exercise | Language | Why This Language | Tests |
|----------|----------|-------------------|-------|
| [CashRegister](./CashRegister) | **Rust** | Financial calculations demand zero-cost abstractions and type safety. Integer-cent arithmetic eliminates floating-point rounding bugs entirely. The trait system maps naturally to the strategy pattern the problem calls for. | 94 |
| [MissingNumber](./MissingNumber) | **Zig** | A tight algorithmic problem suited to a systems language. Zig's explicit allocator model and comptime features show well on small, performance-sensitive code. Demonstrates range beyond Rust while staying in the systems tier. | 70 |
| [MorseCode](./MorseCode) | **Perl** | A text-processing problem at its core — splitting on delimiters and mapping through a lookup table. Perl is *the* language for this domain, and using it signals that language choice is driven by fit, not comfort zone. | 232 |
| [OnScreenKeyboard](./OnScreenKeyboard) | **Python** | If this were production code, it would be scripting device input on a DVR or smart TV — a space where Python dominates. Clean data modeling (layout as a list, index as a dict) makes the solution readable and extensible. | 94 |
| [GildedRose](./GildedRose) | **Go** | An OOP/business logic problem centered on polymorphism and rule engines. Go's interface system is a natural fit — each item category implements a single `Updater` interface, and the registry pattern makes new rules a one-file addition. Go's simplicity forces clean design without hiding behind language features. | 107 |
| [RestaurantReviews](./RestaurantReviews) | **TypeScript/React** | TrueFit's core stack — they maintain the `bach` React composition library and a React-heavy open source portfolio. The most substantial exercise doubles as a unified control panel integrating all 5 other exercises as live panels. | 371 |

## Prerequisites

Check if all required tools are installed:

```sh
make check-deps
```

This prints the status of each dependency with install links for anything missing. Per-language requirements:

| Language | Install |
|----------|---------|
| Rust | [rustup.rs](https://rustup.rs) |
| Zig 0.14+ | [ziglang.org/download](https://ziglang.org/download/) |
| Perl 5.10+ | Usually pre-installed on Linux/macOS |
| Python 3.10+ / pytest | [python.org](https://www.python.org/downloads/), then `pip3 install pytest` |
| Go 1.21+ | [go.dev/dl](https://go.dev/dl/) |
| Node.js 20+ | [nodejs.org](https://nodejs.org/) |

Each exercise's `make test` and `make run` will also check for their specific dependency and print a clear error with install instructions if it's missing.

## Running Exercises

```sh
cd <ExerciseName>
make test    # run the full test suite (always verbose)
make run     # run against sample input
```

Or run everything from the root:

```sh
make test-all    # runs all test suites in sequence
```

## DavesSnackShack

DavesSnackShack is a QA/testing exercise. Rather than treat it as a standalone item, the QA mindset is embedded throughout every exercise above — exhaustive test suites, boundary conditions, error paths, and property-based testing where applicable. The RestaurantReviews dashboard also includes a dedicated security test suite covering injection, XSS, and input validation.

## Philosophy

- **Single Responsibility Principle** enforced throughout — parsing, logic, orchestration, and I/O are always in separate modules.
- **Exhaustive testing** — edge cases, error paths, boundary conditions, and round-trip verification. The goal is that a reviewer has nothing left to question.
- **Language as a design decision** — each choice is deliberate, not default. The portfolio demonstrates breadth and the ability to pick the right tool for the job.
