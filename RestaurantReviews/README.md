# RestaurantReviews — TrueFit Code Challenge

A full-stack TypeScript/React application that implements the RestaurantReviews exercise **and** integrates all 5 other completed exercises as live, interactive panels in a unified dashboard.

## Architecture

- **Express** backend with REST API for RestaurantReviews CRUD
- **React** frontend (Vite) with a tabbed dashboard — one panel per exercise
- **SQLite** (via `better-sqlite3`) for review persistence
- **Subprocess runner** proxies the other 5 exercise binaries (Rust, Zig, Perl, Python, Go) as API endpoints

## Prerequisites

- **Node.js** >= 22.0.0
- **Exercise binaries** must be built before starting the server:

| Exercise | Language | Build command |
|----------|----------|---------------|
| CashRegister | Rust | `cd ../CashRegister && cargo build` |
| MissingNumber | Zig | `cd ../MissingNumber && make build` |
| MorseCode | Perl | No build step (interpreted) |
| OnScreenKeyboard | Python | No build step (interpreted) |
| GildedRose | Go | `cd ../GildedRose && make build` |

## Quick Start

```sh
make test    # 371 tests (server + client)
make run     # builds and starts Express on http://localhost:3000
make dev     # dev mode: Express on :3000, Vite HMR on :5173
```

## RestaurantReviews API

| # | Requirement | Method | Endpoint |
|---|-------------|--------|----------|
| 1 | Create a user | POST | `/api/users` |
| 2 | Create a restaurant | POST | `/api/restaurants` |
| 3 | Create a review | POST | `/api/reviews` |
| 4 | Reviews by user | GET | `/api/reviews?userId=:id` |
| 5 | Reviews by restaurant | GET | `/api/reviews?restaurantId=:id` |
| 6 | Restaurants by city | GET | `/api/restaurants?city=:city` |
| 7 | Delete a review | DELETE | `/api/reviews/:id` |
| 8 | Block a user | PATCH | `/api/users/:id/block` |

Blocked users receive `403` when attempting to create reviews.

## Exercise Proxy Endpoints

Each exercise binary is wrapped as an API call:

| Exercise | Endpoint | Method |
|----------|----------|--------|
| CashRegister | `/api/exercises/cash-register` | POST |
| MissingNumber | `/api/exercises/missing-number` | POST |
| MorseCode | `/api/exercises/morse-code/encode`, `/decode` | POST |
| OnScreenKeyboard | `/api/exercises/on-screen-keyboard` | POST |
| GildedRose | `/api/exercises/gilded-rose/start`, `/:id/command` | POST |

## Project Structure

```
src/
├── server/
│   ├── app.ts              # Express factory (testable)
│   ├── index.ts            # Bootstrap + listen
│   ├── db/                 # SQLite connection + schema
│   ├── models/             # User, Restaurant, Review CRUD
│   ├── routes/             # REST route handlers + shared validation
│   ├── exercises/          # Subprocess runner + per-exercise endpoints
│   ├── middleware/         # Error handler, rate limiting
│   └── __tests__/          # Server tests (supertest + in-memory SQLite)
└── client/
    ├── App.tsx             # Tabbed shell
    ├── components/
    │   ├── exercises/      # One panel per exercise
    │   └── reviews/        # User/Restaurant/Review forms + tables
    ├── hooks/              # useApi fetch wrapper, useMorseAudio
    └── __tests__/          # Component + integration tests
```

## Things To Consider

- **SRP**: Models handle data access only. Routes handle HTTP concerns. Shared validation helpers (`routes/validate.ts`) eliminate duplication across entity routes. The subprocess runner is a generic utility shared by all exercise endpoints.
- **Testability**: The Express app is a factory function accepting a database instance — tests use in-memory SQLite with zero file I/O. Exercise endpoints mock the subprocess runner.
- **Extensibility**: Adding a new exercise means one route file and one line in `app.ts`. Adding a new review entity means one model and one route.
- **The "larger system" claim**: Every exercise says to approach it as part of a larger system. This dashboard *is* that system — all 5 exercises are live, callable panels in a real application.
