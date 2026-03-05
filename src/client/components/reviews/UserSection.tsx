import { useState, useEffect } from "react";
import { useApi } from "../../hooks/useApi.js";
import type { User } from "../../types/index.js";
import { styles } from "./styles.js";

interface Props {
  refreshKey: number;
  onMutate: () => void;
}

export function UserSection({ refreshKey, onMutate }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [rowError, setRowError] = useState<Record<number, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const listApi = useApi<User[]>();
  const createApi = useApi<User>();
  const updateApi = useApi<User>();
  const blockApi = useApi<User>();
  const _deleteApi = useApi<void>();

  useEffect(() => {
    listApi.call("/api/users");
  }, [refreshKey]);

  const handleCreate = async () => {
    if (!name.trim() || !email.trim()) return;
    const result = await createApi.call("/api/users", {
      method: "POST",
      body: JSON.stringify({ name, email }),
    });
    if (result) {
      setName("");
      setEmail("");
      onMutate();
    }
  };

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setConfirmDelete(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditEmail("");
  };

  const handleSave = async (id: number) => {
    if (!editName.trim() || !editEmail.trim()) return;
    const result = await updateApi.call(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name: editName, email: editEmail }),
    });
    if (result) {
      setEditingId(null);
      onMutate();
    }
  };

  const handleBlock = async (id: number) => {
    await blockApi.call(`/api/users/${id}/block`, { method: "PATCH" });
    onMutate();
  };

  const handleUnblock = async (id: number) => {
    await blockApi.call(`/api/users/${id}/unblock`, { method: "PATCH" });
    onMutate();
  };

  const handleDelete = async (id: number) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    setRowError((prev) => ({ ...prev, [id]: "" }));
    setConfirmDelete(null);
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.status === 204) {
      onMutate();
    } else {
      const json = await res.json();
      setRowError((prev) => ({
        ...prev,
        [id]: json.error || `HTTP ${res.status}`,
      }));
    }
  };

  const users = listApi.data ?? [];

  return (
    <section style={styles.section}>
      <h3 style={styles.sectionTitle}>Users</h3>
      <div style={styles.form}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          style={styles.input}
          aria-label="User name"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          style={styles.input}
          aria-label="Email"
        />
        <button onClick={handleCreate} disabled={createApi.loading} style={styles.btn}>
          {createApi.loading ? "Creating..." : "Create User"}
        </button>
      </div>
      {createApi.error && <div role="alert" style={styles.error}>{createApi.error}</div>}
      {updateApi.error && <div role="alert" style={styles.error}>{updateApi.error}</div>}

      {listApi.loading && !listApi.data && (
        <div style={{ color: "#64748b", fontSize: "13px", padding: "16px 0" }}>
          Loading users...
        </div>
      )}

      <table style={styles.table}>
        <thead>
          <tr>
            <th scope="col" style={styles.th}>Name</th>
            <th scope="col" style={styles.th}>Email</th>
            <th scope="col" style={styles.th}>Status</th>
            <th scope="col" style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && !listApi.loading && (
            <tr>
              <td colSpan={4} style={styles.emptyRow}>
                No users yet. Create one above to get started.
              </td>
            </tr>
          )}
          {users.map((u) => (
            <tr key={u.id} data-editing={editingId === u.id || undefined}>
              <td style={styles.td}>
                {editingId === u.id ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={styles.editInput}
                    aria-label="Edit name"
                  />
                ) : (
                  u.name
                )}
              </td>
              <td style={styles.td}>
                {editingId === u.id ? (
                  <input
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    style={styles.editInput}
                    aria-label="Edit email"
                  />
                ) : (
                  u.email
                )}
              </td>
              <td style={styles.td}>
                <span
                  style={{
                    ...styles.statusBadge,
                    background: u.blocked ? "rgba(127, 29, 29, 0.5)" : "rgba(6, 78, 59, 0.5)",
                    color: u.blocked ? "#fca5a5" : "#6ee7b7",
                  }}
                >
                  {u.blocked ? "blocked" : "active"}
                </span>
              </td>
              <td style={styles.td}>
                <div style={styles.actions}>
                  {editingId === u.id ? (
                    <>
                      <button onClick={() => handleSave(u.id)} style={styles.btnSuccessSmall}>
                        Save
                      </button>
                      <button onClick={cancelEdit} style={styles.btnCancelSmall}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(u)} style={styles.btnSmall}>
                        Edit
                      </button>
                      {u.blocked ? (
                        <button onClick={() => handleUnblock(u.id)} style={styles.btnSuccessSmall}>
                          Unblock
                        </button>
                      ) : (
                        <button onClick={() => handleBlock(u.id)} style={styles.btnWarningSmall}>
                          Block
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(u.id)}
                        style={confirmDelete === u.id ? styles.btnDanger : styles.btnDangerSmall}
                      >
                        {confirmDelete === u.id ? "Confirm?" : "Delete"}
                      </button>
                    </>
                  )}
                </div>
                {rowError[u.id] && <div style={styles.rowError}>{rowError[u.id]}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
