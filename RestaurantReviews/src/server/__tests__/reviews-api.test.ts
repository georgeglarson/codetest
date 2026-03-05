import { describe, it, expect } from "vitest";
import request from "supertest";
import Database from "better-sqlite3";
import { createApp } from "../app.js";

function freshApp() {
  const db = new Database(":memory:");
  const app = createApp(db);
  return { app, db };
}

// ── Helpers ──────────────────────────────────────────────────────────

async function createUser(
  app: ReturnType<typeof freshApp>["app"],
  name = "Alice",
  email = "alice@example.com"
) {
  const res = await request(app).post("/api/users").send({ name, email });
  return res.body;
}

async function createRestaurant(
  app: ReturnType<typeof freshApp>["app"],
  name = "Pizza Palace",
  city = "Pittsburgh",
  cuisine = "Italian"
) {
  const res = await request(app).post("/api/restaurants").send({ name, city, cuisine });
  return res.body;
}

async function createReview(
  app: ReturnType<typeof freshApp>["app"],
  userId: number,
  restaurantId: number,
  rating = 4,
  body = "Great food!"
) {
  const res = await request(app).post("/api/reviews").send({ userId, restaurantId, rating, body });
  return res;
}

// ── Users ────────────────────────────────────────────────────────────

describe("GET /api/users", () => {
  it("returns all users", async () => {
    const { app } = freshApp();
    await createUser(app, "Alice", "alice@example.com");
    await createUser(app, "Bob", "bob@example.com");
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe("Alice");
    expect(res.body[1].name).toBe("Bob");
  });

  it("returns empty array when no users", async () => {
    const { app } = freshApp();
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("GET /api/users/:id", () => {
  it("returns a single user", async () => {
    const { app } = freshApp();
    await createUser(app);
    const res = await request(app).get("/api/users/1");
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Alice");
  });

  it("returns 404 for non-existent user", async () => {
    const { app } = freshApp();
    const res = await request(app).get("/api/users/999");
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid id", async () => {
    const { app } = freshApp();
    const res = await request(app).get("/api/users/abc");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/users", () => {
  it("creates a user with valid data", async () => {
    const { app } = freshApp();
    const res = await request(app)
      .post("/api/users")
      .send({ name: "Alice", email: "alice@example.com" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 1,
      name: "Alice",
      email: "alice@example.com",
      blocked: 0,
    });
    expect(res.body.created_at).toBeDefined();
  });

  it("rejects missing name", async () => {
    const { app } = freshApp();
    const res = await request(app).post("/api/users").send({ email: "a@b.com" });
    expect(res.status).toBe(400);
  });

  it("rejects missing email", async () => {
    const { app } = freshApp();
    const res = await request(app).post("/api/users").send({ name: "Alice" });
    expect(res.status).toBe(400);
  });

  it("rejects empty name", async () => {
    const { app } = freshApp();
    const res = await request(app).post("/api/users").send({ name: "  ", email: "a@b.com" });
    expect(res.status).toBe(400);
  });

  it("rejects empty email", async () => {
    const { app } = freshApp();
    const res = await request(app).post("/api/users").send({ name: "Alice", email: "  " });
    expect(res.status).toBe(400);
  });

  it("rejects non-string name", async () => {
    const { app } = freshApp();
    const res = await request(app).post("/api/users").send({ name: 123, email: "a@b.com" });
    expect(res.status).toBe(400);
  });

  it("rejects duplicate email", async () => {
    const { app } = freshApp();
    await request(app).post("/api/users").send({ name: "Alice", email: "alice@example.com" });
    const res = await request(app)
      .post("/api/users")
      .send({ name: "Bob", email: "alice@example.com" });
    expect(res.status).toBe(409);
  });

  it("trims whitespace from name and email", async () => {
    const { app } = freshApp();
    const res = await request(app)
      .post("/api/users")
      .send({ name: "  Alice  ", email: "  alice@example.com  " });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Alice");
    expect(res.body.email).toBe("alice@example.com");
  });

  it("creates multiple users with unique emails", async () => {
    const { app } = freshApp();
    const r1 = await request(app)
      .post("/api/users")
      .send({ name: "Alice", email: "alice@example.com" });
    const r2 = await request(app)
      .post("/api/users")
      .send({ name: "Bob", email: "bob@example.com" });
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    expect(r2.body.id).toBe(2);
  });
});

describe("PUT /api/users/:id", () => {
  it("updates a user", async () => {
    const { app } = freshApp();
    await createUser(app);
    const res = await request(app)
      .put("/api/users/1")
      .send({ name: "Alicia", email: "alicia@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Alicia");
    expect(res.body.email).toBe("alicia@example.com");
  });

  it("returns 404 for non-existent user", async () => {
    const { app } = freshApp();
    const res = await request(app).put("/api/users/999").send({ name: "X", email: "x@x.com" });
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid id", async () => {
    const { app } = freshApp();
    const res = await request(app).put("/api/users/abc").send({ name: "X", email: "x@x.com" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing name", async () => {
    const { app } = freshApp();
    await createUser(app);
    const res = await request(app).put("/api/users/1").send({ email: "x@x.com" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for blank email", async () => {
    const { app } = freshApp();
    await createUser(app);
    const res = await request(app).put("/api/users/1").send({ name: "Alice", email: "  " });
    expect(res.status).toBe(400);
  });

  it("returns 409 when email conflicts with another user", async () => {
    const { app } = freshApp();
    await createUser(app, "Alice", "alice@example.com");
    await createUser(app, "Bob", "bob@example.com");
    const res = await request(app)
      .put("/api/users/2")
      .send({ name: "Bob", email: "alice@example.com" });
    expect(res.status).toBe(409);
  });

  it("allows keeping same email on update", async () => {
    const { app } = freshApp();
    await createUser(app);
    const res = await request(app)
      .put("/api/users/1")
      .send({ name: "Alicia", email: "alice@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Alicia");
  });

  it("trims whitespace", async () => {
    const { app } = freshApp();
    await createUser(app);
    const res = await request(app)
      .put("/api/users/1")
      .send({ name: "  Alicia  ", email: "  alicia@example.com  " });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Alicia");
    expect(res.body.email).toBe("alicia@example.com");
  });
});

// ── Block User ───────────────────────────────────────────────────────

describe("PATCH /api/users/:id/block", () => {
  it("blocks an existing user", async () => {
    const { app } = freshApp();
    await createUser(app);
    const res = await request(app).patch("/api/users/1/block");
    expect(res.status).toBe(200);
    expect(res.body.blocked).toBe(1);
  });

  it("returns 404 for non-existent user", async () => {
    const { app } = freshApp();
    const res = await request(app).patch("/api/users/999/block");
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid id", async () => {
    const { app } = freshApp();
    const res = await request(app).patch("/api/users/abc/block");
    expect(res.status).toBe(400);
  });

  it("blocking is idempotent", async () => {
    const { app } = freshApp();
    await createUser(app);
    await request(app).patch("/api/users/1/block");
    const res = await request(app).patch("/api/users/1/block");
    expect(res.status).toBe(200);
    expect(res.body.blocked).toBe(1);
  });
});

// ── Unblock User ────────────────────────────────────────────────────

describe("PATCH /api/users/:id/unblock", () => {
  it("unblocks a blocked user", async () => {
    const { app } = freshApp();
    await createUser(app);
    await request(app).patch("/api/users/1/block");
    const res = await request(app).patch("/api/users/1/unblock");
    expect(res.status).toBe(200);
    expect(res.body.blocked).toBe(0);
  });

  it("returns 404 for non-existent user", async () => {
    const { app } = freshApp();
    const res = await request(app).patch("/api/users/999/unblock");
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid id", async () => {
    const { app } = freshApp();
    const res = await request(app).patch("/api/users/abc/unblock");
    expect(res.status).toBe(400);
  });

  it("unblocking is idempotent", async () => {
    const { app } = freshApp();
    await createUser(app);
    const res = await request(app).patch("/api/users/1/unblock");
    expect(res.status).toBe(200);
    expect(res.body.blocked).toBe(0);
  });
});

// ── Delete User ─────────────────────────────────────────────────────

describe("DELETE /api/users/:id", () => {
  it("deletes a user with no reviews", async () => {
    const { app } = freshApp();
    await createUser(app);
    const res = await request(app).delete("/api/users/1");
    expect(res.status).toBe(204);
  });

  it("confirms deleted user is gone", async () => {
    const { app } = freshApp();
    await createUser(app);
    await request(app).delete("/api/users/1");
    const res = await request(app).get("/api/users/1");
    expect(res.status).toBe(404);
  });

  it("returns 404 for non-existent user", async () => {
    const { app } = freshApp();
    const res = await request(app).delete("/api/users/999");
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid id", async () => {
    const { app } = freshApp();
    const res = await request(app).delete("/api/users/abc");
    expect(res.status).toBe(400);
  });

  it("returns 409 when user has reviews", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const restaurant = await createRestaurant(app);
    await createReview(app, user.id, restaurant.id);
    const res = await request(app).delete(`/api/users/${user.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toContain("reviews");
  });
});

// ── Restaurants ──────────────────────────────────────────────────────

describe("POST /api/restaurants", () => {
  it("creates a restaurant", async () => {
    const { app } = freshApp();
    const res = await request(app)
      .post("/api/restaurants")
      .send({ name: "Pizza Palace", city: "Pittsburgh", cuisine: "Italian" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 1,
      name: "Pizza Palace",
      city: "Pittsburgh",
      cuisine: "Italian",
    });
  });

  it("creates a restaurant without cuisine", async () => {
    const { app } = freshApp();
    const res = await request(app)
      .post("/api/restaurants")
      .send({ name: "Pizza Palace", city: "Pittsburgh" });
    expect(res.status).toBe(201);
    expect(res.body.cuisine).toBe("");
  });

  it("rejects missing name", async () => {
    const { app } = freshApp();
    const res = await request(app).post("/api/restaurants").send({ city: "Pittsburgh" });
    expect(res.status).toBe(400);
  });

  it("rejects missing city", async () => {
    const { app } = freshApp();
    const res = await request(app).post("/api/restaurants").send({ name: "Pizza Palace" });
    expect(res.status).toBe(400);
  });

  it("rejects blank name", async () => {
    const { app } = freshApp();
    const res = await request(app)
      .post("/api/restaurants")
      .send({ name: "  ", city: "Pittsburgh" });
    expect(res.status).toBe(400);
  });

  it("rejects non-string name", async () => {
    const { app } = freshApp();
    const res = await request(app).post("/api/restaurants").send({ name: 42, city: "Pittsburgh" });
    expect(res.status).toBe(400);
  });

  it("trims whitespace", async () => {
    const { app } = freshApp();
    const res = await request(app)
      .post("/api/restaurants")
      .send({ name: "  Pizza  ", city: "  Pittsburgh  " });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Pizza");
    expect(res.body.city).toBe("Pittsburgh");
  });
});

describe("GET /api/restaurants", () => {
  it("returns all restaurants when no filter", async () => {
    const { app } = freshApp();
    await createRestaurant(app, "Place A", "Pittsburgh");
    await createRestaurant(app, "Place B", "Philadelphia");
    const res = await request(app).get("/api/restaurants");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("filters by city", async () => {
    const { app } = freshApp();
    await createRestaurant(app, "Place A", "Pittsburgh");
    await createRestaurant(app, "Place B", "Philadelphia");
    await createRestaurant(app, "Place C", "Pittsburgh");
    const res = await request(app).get("/api/restaurants?city=Pittsburgh");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.every((r: Record<string, unknown>) => r.city === "Pittsburgh")).toBe(true);
  });

  it("city filter is case-insensitive", async () => {
    const { app } = freshApp();
    await createRestaurant(app, "Place A", "Pittsburgh");
    const res = await request(app).get("/api/restaurants?city=pittsburgh");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("returns empty array for unknown city", async () => {
    const { app } = freshApp();
    const res = await request(app).get("/api/restaurants?city=Narnia");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("GET /api/restaurants/:id", () => {
  it("returns a single restaurant", async () => {
    const { app } = freshApp();
    await createRestaurant(app);
    const res = await request(app).get("/api/restaurants/1");
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Pizza Palace");
  });

  it("returns 404 for non-existent restaurant", async () => {
    const { app } = freshApp();
    const res = await request(app).get("/api/restaurants/999");
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid id", async () => {
    const { app } = freshApp();
    const res = await request(app).get("/api/restaurants/abc");
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/restaurants/:id", () => {
  it("updates a restaurant", async () => {
    const { app } = freshApp();
    await createRestaurant(app);
    const res = await request(app)
      .put("/api/restaurants/1")
      .send({ name: "New Name", city: "New City", cuisine: "Mexican" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New Name");
    expect(res.body.city).toBe("New City");
    expect(res.body.cuisine).toBe("Mexican");
  });

  it("returns 404 for non-existent restaurant", async () => {
    const { app } = freshApp();
    const res = await request(app).put("/api/restaurants/999").send({ name: "X", city: "Y" });
    expect(res.status).toBe(404);
  });

  it("returns 400 for missing name", async () => {
    const { app } = freshApp();
    await createRestaurant(app);
    const res = await request(app).put("/api/restaurants/1").send({ city: "City" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid id", async () => {
    const { app } = freshApp();
    const res = await request(app).put("/api/restaurants/abc").send({ name: "X", city: "Y" });
    expect(res.status).toBe(400);
  });

  it("trims whitespace", async () => {
    const { app } = freshApp();
    await createRestaurant(app);
    const res = await request(app)
      .put("/api/restaurants/1")
      .send({ name: "  New  ", city: "  City  " });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New");
    expect(res.body.city).toBe("City");
  });
});

describe("DELETE /api/restaurants/:id", () => {
  it("deletes a restaurant with no reviews", async () => {
    const { app } = freshApp();
    await createRestaurant(app);
    const res = await request(app).delete("/api/restaurants/1");
    expect(res.status).toBe(204);
  });

  it("confirms deleted restaurant is gone", async () => {
    const { app } = freshApp();
    await createRestaurant(app);
    await request(app).delete("/api/restaurants/1");
    const res = await request(app).get("/api/restaurants/1");
    expect(res.status).toBe(404);
  });

  it("returns 404 for non-existent restaurant", async () => {
    const { app } = freshApp();
    const res = await request(app).delete("/api/restaurants/999");
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid id", async () => {
    const { app } = freshApp();
    const res = await request(app).delete("/api/restaurants/abc");
    expect(res.status).toBe(400);
  });

  it("returns 409 when restaurant has reviews", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const restaurant = await createRestaurant(app);
    await createReview(app, user.id, restaurant.id);
    const res = await request(app).delete(`/api/restaurants/${restaurant.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toContain("reviews");
  });
});

// ── Reviews ──────────────────────────────────────────────────────────

describe("POST /api/reviews", () => {
  it("creates a review", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const restaurant = await createRestaurant(app);
    const res = await createReview(app, user.id, restaurant.id, 5, "Amazing!");
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 1,
      user_id: user.id,
      restaurant_id: restaurant.id,
      rating: 5,
      body: "Amazing!",
    });
  });

  it("creates a review without body", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const restaurant = await createRestaurant(app);
    const res = await request(app)
      .post("/api/reviews")
      .send({ userId: user.id, restaurantId: restaurant.id, rating: 3 });
    expect(res.status).toBe(201);
    expect(res.body.body).toBe("");
  });

  it("rejects missing userId", async () => {
    const { app } = freshApp();
    const res = await request(app).post("/api/reviews").send({ restaurantId: 1, rating: 3 });
    expect(res.status).toBe(400);
  });

  it("rejects missing restaurantId", async () => {
    const { app } = freshApp();
    const res = await request(app).post("/api/reviews").send({ userId: 1, rating: 3 });
    expect(res.status).toBe(400);
  });

  it("rejects missing rating", async () => {
    const { app } = freshApp();
    const res = await request(app).post("/api/reviews").send({ userId: 1, restaurantId: 1 });
    expect(res.status).toBe(400);
  });

  it("rejects rating below 1", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const restaurant = await createRestaurant(app);
    const res = await createReview(app, user.id, restaurant.id, 0);
    expect(res.status).toBe(400);
  });

  it("rejects rating above 5", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const restaurant = await createRestaurant(app);
    const res = await createReview(app, user.id, restaurant.id, 6);
    expect(res.status).toBe(400);
  });

  it("rejects non-integer rating", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const restaurant = await createRestaurant(app);
    const res = await createReview(app, user.id, restaurant.id, 3.5);
    expect(res.status).toBe(400);
  });

  it("rejects non-existent user", async () => {
    const { app } = freshApp();
    const restaurant = await createRestaurant(app);
    const res = await createReview(app, 999, restaurant.id);
    expect(res.status).toBe(404);
    expect(res.body.error).toContain("user");
  });

  it("rejects non-existent restaurant", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const res = await createReview(app, user.id, 999);
    expect(res.status).toBe(404);
    expect(res.body.error).toContain("restaurant");
  });

  it("rejects review from blocked user", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const restaurant = await createRestaurant(app);
    await request(app).patch(`/api/users/${user.id}/block`);
    const res = await createReview(app, user.id, restaurant.id);
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("blocked");
  });

  it("allows multiple reviews from same user on different restaurants", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const r1 = await createRestaurant(app, "Place A", "City");
    const r2 = await createRestaurant(app, "Place B", "City");
    const res1 = await createReview(app, user.id, r1.id);
    const res2 = await createReview(app, user.id, r2.id);
    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
  });

  it("rejects non-numeric ids", async () => {
    const { app } = freshApp();
    const res = await request(app)
      .post("/api/reviews")
      .send({ userId: "abc", restaurantId: 1, rating: 3 });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/reviews", () => {
  it("returns all reviews with names when no filter", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const restaurant = await createRestaurant(app);
    await createReview(app, user.id, restaurant.id, 5, "Amazing!");
    const res = await request(app).get("/api/reviews");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].user_name).toBe("Alice");
    expect(res.body[0].restaurant_name).toBe("Pizza Palace");
  });

  it("returns empty array when no reviews exist", async () => {
    const { app } = freshApp();
    const res = await request(app).get("/api/reviews");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns reviews by userId with names", async () => {
    const { app } = freshApp();
    const alice = await createUser(app, "Alice", "alice@example.com");
    const bob = await createUser(app, "Bob", "bob@example.com");
    const restaurant = await createRestaurant(app);
    await createReview(app, alice.id, restaurant.id, 5, "Love it");
    await createReview(app, alice.id, restaurant.id, 4, "Still good");
    await createReview(app, bob.id, restaurant.id, 3, "Meh");

    const res = await request(app).get(`/api/reviews?userId=${alice.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.every((r: Record<string, unknown>) => r.user_id === alice.id)).toBe(true);
    expect(res.body[0].user_name).toBe("Alice");
    expect(res.body[0].restaurant_name).toBe("Pizza Palace");
  });

  it("returns reviews by restaurantId with names", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const r1 = await createRestaurant(app, "Place A", "City");
    const r2 = await createRestaurant(app, "Place B", "City");
    await createReview(app, user.id, r1.id, 5);
    await createReview(app, user.id, r2.id, 3);

    const res = await request(app).get(`/api/reviews?restaurantId=${r1.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].restaurant_id).toBe(r1.id);
    expect(res.body[0].user_name).toBe("Alice");
    expect(res.body[0].restaurant_name).toBe("Place A");
  });

  it("returns empty array for user with no reviews", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const res = await request(app).get(`/api/reviews?userId=${user.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 400 for invalid userId", async () => {
    const { app } = freshApp();
    const res = await request(app).get("/api/reviews?userId=abc");
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid restaurantId", async () => {
    const { app } = freshApp();
    const res = await request(app).get("/api/reviews?restaurantId=abc");
    expect(res.status).toBe(400);
  });

  it("userId takes precedence when both userId and restaurantId are provided", async () => {
    const { app } = freshApp();
    const alice = await createUser(app, "Alice", "alice@example.com");
    const bob = await createUser(app, "Bob", "bob@example.com");
    const r1 = await createRestaurant(app, "Place A", "City");
    const r2 = await createRestaurant(app, "Place B", "City");
    // Alice reviews r1; Bob reviews r2
    await createReview(app, alice.id, r1.id, 5, "Alice @ A");
    await createReview(app, bob.id, r2.id, 3, "Bob @ B");

    // Both filters: userId=alice, restaurantId=r2
    // Since userId is checked first, we get Alice's reviews (not r2's)
    const res = await request(app).get(
      `/api/reviews?userId=${alice.id}&restaurantId=${r2.id}`
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].user_id).toBe(alice.id);
    expect(res.body[0].restaurant_id).toBe(r1.id); // Alice's review is on r1, not r2
  });
});

describe("GET /api/reviews/:id", () => {
  it("returns a single review", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const restaurant = await createRestaurant(app);
    await createReview(app, user.id, restaurant.id, 5, "Great!");
    const res = await request(app).get("/api/reviews/1");
    expect(res.status).toBe(200);
    expect(res.body.rating).toBe(5);
    expect(res.body.body).toBe("Great!");
  });

  it("returns 404 for non-existent review", async () => {
    const { app } = freshApp();
    const res = await request(app).get("/api/reviews/999");
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid id", async () => {
    const { app } = freshApp();
    const res = await request(app).get("/api/reviews/abc");
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/reviews/:id", () => {
  it("updates rating and body", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const restaurant = await createRestaurant(app);
    await createReview(app, user.id, restaurant.id, 3, "OK");
    const res = await request(app)
      .put("/api/reviews/1")
      .send({ rating: 5, body: "Actually great!" });
    expect(res.status).toBe(200);
    expect(res.body.rating).toBe(5);
    expect(res.body.body).toBe("Actually great!");
  });

  it("preserves user_id and restaurant_id", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const restaurant = await createRestaurant(app);
    await createReview(app, user.id, restaurant.id, 3, "OK");
    const res = await request(app).put("/api/reviews/1").send({ rating: 5, body: "Better" });
    expect(res.body.user_id).toBe(user.id);
    expect(res.body.restaurant_id).toBe(restaurant.id);
  });

  it("returns 404 for non-existent review", async () => {
    const { app } = freshApp();
    const res = await request(app).put("/api/reviews/999").send({ rating: 5, body: "X" });
    expect(res.status).toBe(404);
  });

  it("returns 400 for missing rating", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const restaurant = await createRestaurant(app);
    await createReview(app, user.id, restaurant.id);
    const res = await request(app).put("/api/reviews/1").send({ body: "X" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid rating", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const restaurant = await createRestaurant(app);
    await createReview(app, user.id, restaurant.id);
    const res = await request(app).put("/api/reviews/1").send({ rating: 6 });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid id", async () => {
    const { app } = freshApp();
    const res = await request(app).put("/api/reviews/abc").send({ rating: 5 });
    expect(res.status).toBe(400);
  });

  it("returns 400 for rating=0", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const restaurant = await createRestaurant(app);
    await createReview(app, user.id, restaurant.id);
    const res = await request(app).put("/api/reviews/1").send({ rating: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("rating");
  });

  it("returns 400 for rating=6", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const restaurant = await createRestaurant(app);
    await createReview(app, user.id, restaurant.id);
    const res = await request(app).put("/api/reviews/1").send({ rating: 6 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("rating");
  });

  it("returns 400 for float rating (3.5)", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const restaurant = await createRestaurant(app);
    await createReview(app, user.id, restaurant.id);
    const res = await request(app).put("/api/reviews/1").send({ rating: 3.5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("rating");
  });

  it("keeps existing body when body not provided", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const restaurant = await createRestaurant(app);
    await createReview(app, user.id, restaurant.id, 3, "Original");
    const res = await request(app).put("/api/reviews/1").send({ rating: 5 });
    expect(res.status).toBe(200);
    expect(res.body.body).toBe("Original");
  });
});

describe("DELETE /api/reviews/:id", () => {
  it("deletes an existing review", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const restaurant = await createRestaurant(app);
    await createReview(app, user.id, restaurant.id);
    const res = await request(app).delete("/api/reviews/1");
    expect(res.status).toBe(204);
  });

  it("confirms deleted review is gone", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const restaurant = await createRestaurant(app);
    await createReview(app, user.id, restaurant.id);
    await request(app).delete("/api/reviews/1");
    const res = await request(app).get(`/api/reviews?userId=${user.id}`);
    expect(res.body).toHaveLength(0);
  });

  it("returns 404 for non-existent review", async () => {
    const { app } = freshApp();
    const res = await request(app).delete("/api/reviews/999");
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid id", async () => {
    const { app } = freshApp();
    const res = await request(app).delete("/api/reviews/abc");
    expect(res.status).toBe(400);
  });

  it("double-delete returns 404", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const restaurant = await createRestaurant(app);
    await createReview(app, user.id, restaurant.id);
    await request(app).delete("/api/reviews/1");
    const res = await request(app).delete("/api/reviews/1");
    expect(res.status).toBe(404);
  });
});

// ── Integration: Block + Review interaction ──────────────────────────

describe("Block/Review interaction", () => {
  it("existing reviews remain after blocking", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const restaurant = await createRestaurant(app);
    await createReview(app, user.id, restaurant.id, 5, "Great!");
    await request(app).patch(`/api/users/${user.id}/block`);

    const res = await request(app).get(`/api/reviews?userId=${user.id}`);
    expect(res.body).toHaveLength(1);
  });

  it("blocked user cannot create new reviews but old ones persist", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const r1 = await createRestaurant(app, "Place A", "City");
    const r2 = await createRestaurant(app, "Place B", "City");
    await createReview(app, user.id, r1.id, 5);
    await request(app).patch(`/api/users/${user.id}/block`);
    const createRes = await createReview(app, user.id, r2.id, 3);
    expect(createRes.status).toBe(403);

    const listRes = await request(app).get(`/api/reviews?userId=${user.id}`);
    expect(listRes.body).toHaveLength(1);
  });

  it("unblocked user can create reviews again", async () => {
    const { app } = freshApp();
    const user = await createUser(app);
    const restaurant = await createRestaurant(app);
    await request(app).patch(`/api/users/${user.id}/block`);
    await request(app).patch(`/api/users/${user.id}/unblock`);
    const res = await createReview(app, user.id, restaurant.id);
    expect(res.status).toBe(201);
  });
});
