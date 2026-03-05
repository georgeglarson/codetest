import { useState, useEffect } from "react";
import { useApi } from "../../hooks/useApi.js";
import type { User, Restaurant, ReviewWithNames } from "../../types/index.js";
import { styles } from "./styles.js";

interface Props {
  refreshKey: number;
  onMutate: () => void;
}

const STAR = "\u2605";

function Stars({ n }: { n: number }) {
  return (
    <span style={{ color: "#fbbf24", letterSpacing: "1px" }}>
      {STAR.repeat(n)}
      <span style={{ color: "#334155" }}>{STAR.repeat(5 - n)}</span>
    </span>
  );
}

export function ReviewSection({ refreshKey, onMutate }: Props) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [rating, setRating] = useState("");
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRating, setEditRating] = useState("");
  const [editBody, setEditBody] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const usersApi = useApi<User[]>();
  const restaurantsApi = useApi<Restaurant[]>();
  const listApi = useApi<ReviewWithNames[]>();
  const createApi = useApi<ReviewWithNames>();
  const updateApi = useApi<ReviewWithNames>();

  useEffect(() => {
    listApi.call("/api/reviews");
    usersApi.call("/api/users");
    restaurantsApi.call("/api/restaurants");
  }, [refreshKey]);

  const handleCreate = async () => {
    if (!selectedUserId || !selectedRestaurantId || !rating) return;
    const result = await createApi.call("/api/reviews", {
      method: "POST",
      body: JSON.stringify({
        userId: Number(selectedUserId),
        restaurantId: Number(selectedRestaurantId),
        rating: Number(rating),
        body,
      }),
    });
    if (result) {
      setSelectedUserId("");
      setSelectedRestaurantId("");
      setRating("");
      setBody("");
      onMutate();
    }
  };

  const startEdit = (review: ReviewWithNames) => {
    setEditingId(review.id);
    setEditRating(String(review.rating));
    setEditBody(review.body);
    setConfirmDelete(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSave = async (id: number) => {
    if (!editRating) return;
    const result = await updateApi.call(`/api/reviews/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        rating: Number(editRating),
        body: editBody,
      }),
    });
    if (result) {
      setEditingId(null);
      onMutate();
    }
  };

  const handleDelete = async (id: number) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    setConfirmDelete(null);
    const res = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
    if (res.status === 204) {
      onMutate();
    }
  };

  const users = usersApi.data ?? [];
  const restaurants = restaurantsApi.data ?? [];
  const reviews = listApi.data ?? [];

  return (
    <section style={styles.section}>
      <h3 style={styles.sectionTitle}>Reviews</h3>
      <div style={styles.form}>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          style={styles.select}
          aria-label="Select user"
        >
          <option value="">Select user...</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email}){u.blocked ? " [blocked]" : ""}
            </option>
          ))}
        </select>
        <select
          value={selectedRestaurantId}
          onChange={(e) => setSelectedRestaurantId(e.target.value)}
          style={styles.select}
          aria-label="Select restaurant"
        >
          <option value="">Select restaurant...</option>
          {restaurants.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}, {r.city}
            </option>
          ))}
        </select>
        <select
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          style={styles.select}
          aria-label="Select rating"
        >
          <option value="">Rating...</option>
          <option value="1">1 - Poor</option>
          <option value="2">2 - Fair</option>
          <option value="3">3 - Good</option>
          <option value="4">4 - Great</option>
          <option value="5">5 - Excellent</option>
        </select>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Comment (optional)"
          style={{ ...styles.input, minHeight: "36px", flex: 1 }}
          aria-label="Comment"
        />
        <button onClick={handleCreate} disabled={createApi.loading} style={styles.btn}>
          {createApi.loading ? "Creating..." : "Create"}
        </button>
      </div>
      {createApi.error && <div role="alert" style={styles.error}>{createApi.error}</div>}
      {updateApi.error && <div role="alert" style={styles.error}>{updateApi.error}</div>}

      {listApi.loading && !listApi.data && (
        <div style={{ color: "#64748b", fontSize: "13px", padding: "16px 0" }}>
          Loading reviews...
        </div>
      )}

      <table style={styles.table}>
        <thead>
          <tr>
            <th scope="col" style={styles.th}>User</th>
            <th scope="col" style={styles.th}>Restaurant</th>
            <th scope="col" style={styles.th}>Rating</th>
            <th scope="col" style={styles.th}>Comment</th>
            <th scope="col" style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reviews.length === 0 && !listApi.loading && (
            <tr>
              <td colSpan={5} style={styles.emptyRow}>
                No reviews yet. Select a user and restaurant above to create one.
              </td>
            </tr>
          )}
          {reviews.map((r) => (
            <tr key={r.id} data-editing={editingId === r.id || undefined}>
              <td style={styles.td}>{r.user_name}</td>
              <td style={styles.td}>{r.restaurant_name}</td>
              <td style={styles.td}>
                {editingId === r.id ? (
                  <select
                    value={editRating}
                    onChange={(e) => setEditRating(e.target.value)}
                    style={styles.editInput}
                    aria-label="Edit rating"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Stars n={r.rating} />
                )}
              </td>
              <td style={styles.td}>
                {editingId === r.id ? (
                  <input
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    style={styles.editInput}
                    aria-label="Edit comment"
                  />
                ) : (
                  r.body || "\u2014"
                )}
              </td>
              <td style={styles.td}>
                <div style={styles.actions}>
                  {editingId === r.id ? (
                    <>
                      <button onClick={() => handleSave(r.id)} style={styles.btnSuccessSmall}>
                        Save
                      </button>
                      <button onClick={cancelEdit} style={styles.btnCancelSmall}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(r)} style={styles.btnSmall}>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        style={confirmDelete === r.id ? styles.btnDanger : styles.btnDangerSmall}
                      >
                        {confirmDelete === r.id ? "Confirm?" : "Delete"}
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
