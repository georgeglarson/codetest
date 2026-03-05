import { useState } from "react";
import { useApi } from "../../hooks/useApi.js";

const DEFAULT_INVENTORY = `Aged Brie,Aged,2,0
Elixir of the Mongoose,Normal,5,7
Sulfuras Hand of Ragnaros,Legendary,0,80
Backstage passes to a TAFKAL80ETC concert,BackstagePass,15,20
Conjured Mana Cake,Conjured,3,6`;

export function GildedRosePanel() {
  const [inventory, setInventory] = useState(DEFAULT_INVENTORY);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [command, setCommand] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [day, setDay] = useState(0);

  const startApi = useApi<{ sessionId: string; day: number }>();
  const cmdApi = useApi<{ output: string; day: number }>();

  const handleStart = async () => {
    if (!inventory.trim()) return;
    const result = await startApi.call("/api/exercises/gilded-rose/start", {
      method: "POST",
      body: JSON.stringify({ inventory }),
    });
    if (result) {
      setSessionId(result.sessionId);
      setDay(result.day);
      setLog([
        "Session started — inventory loaded.",
        "",
        "Commands:",
        "  list          Show all items with SellIn and Quality",
        "  next          Advance one day (items update)",
        "  item <name>   Show a single item (exact name)",
        "  trash         Show items that hit Quality 0",
        "  help          Show commands",
        "",
        "Try 'list' to see your inventory, then 'next' to advance a day.",
      ]);
    }
  };

  const handleCommand = async () => {
    if (!sessionId || !command.trim()) return;
    setLog((prev) => [...prev, `[Day ${day}] > ${command}`]);
    const result = await cmdApi.call(
      `/api/exercises/gilded-rose/${sessionId}/command`,
      {
        method: "POST",
        body: JSON.stringify({ command }),
      }
    );
    if (result) {
      if (result.output) setLog((prev) => [...prev, result.output]);
      setDay(result.day);
    }
    if (cmdApi.error) {
      setLog((prev) => [...prev, `Error: ${cmdApi.error}`]);
    }
    setCommand("");
  };

  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>Gilded Rose</h2>
      <p style={styles.desc}>
        A shop inventory simulator. Items degrade (or improve) in Quality each
        day according to category rules. Load an inventory, then step through
        days to watch the rules play out.
      </p>

      {!sessionId ? (
        <>
          <div style={styles.rulesBox}>
            <div style={styles.rulesTitle}>Category Rules</div>
            <div style={styles.rulesGrid}>
              <div><strong style={styles.cat}>Normal</strong> &mdash; Quality drops by 1/day, doubles after SellIn expires</div>
              <div><strong style={styles.cat}>Aged</strong> &mdash; Quality <em>increases</em> by 1/day (better with age)</div>
              <div><strong style={styles.cat}>Legendary</strong> &mdash; Never sold, never degrades (Quality stays 80)</div>
              <div><strong style={styles.cat}>BackstagePass</strong> &mdash; Quality rises as the concert nears: +2 at 10 days, +3 at 5 days, drops to 0 after</div>
              <div><strong style={styles.cat}>Conjured</strong> &mdash; Degrades twice as fast as Normal items</div>
            </div>
            <div style={{ marginTop: "8px", color: "#64748b", fontSize: "12px" }}>
              Quality is always 0&ndash;50 (except Legendary at 80).
            </div>
          </div>
          <div style={styles.csvLabel}>
            Inventory CSV &mdash; one item per line: <code style={styles.code}>Name,Category,SellIn,Quality</code>
          </div>
          <textarea
            value={inventory}
            onChange={(e) => setInventory(e.target.value)}
            rows={8}
            style={styles.textarea}
          />
          <button
            onClick={handleStart}
            disabled={startApi.loading}
            style={styles.button}
          >
            {startApi.loading ? "Starting..." : "Start Session"}
          </button>
          {startApi.error && (
            <div style={styles.error}>{startApi.error}</div>
          )}
        </>
      ) : (
        <>
          <pre style={styles.log}>
            {log.join("\n") || "(empty)"}
          </pre>
          <div style={styles.cmdRow}>
            <span style={styles.prompt}>[Day {day}] &gt;</span>
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCommand()}
              placeholder="list, next, item <name>, trash, help, quit"
              style={styles.input}
              autoFocus
            />
            <button
              onClick={handleCommand}
              disabled={cmdApi.loading}
              style={styles.sendBtn}
            >
              Send
            </button>
          </div>
          <button
            onClick={() => {
              if (sessionId) {
                fetch(`/api/exercises/gilded-rose/${encodeURIComponent(sessionId)}`, {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                }).catch((err) => {
                  console.error("Failed to end session:", err);
                });
              }
              setSessionId(null);
              setLog([]);
              setDay(0);
            }}
            style={styles.resetBtn}
          >
            End Session
          </button>
        </>
      )}
    </div>
  );
}

const styles = {
  panel: { padding: "24px", maxWidth: "800px" },
  title: { fontSize: "24px", marginBottom: "8px", color: "#f1f5f9" },
  desc: { color: "#94a3b8", marginBottom: "16px", fontSize: "14px" },
  rulesBox: {
    padding: "12px 16px",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "6px",
    marginBottom: "16px",
    fontSize: "13px",
    color: "#cbd5e1",
    lineHeight: "1.6",
  },
  rulesTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#94a3b8",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginBottom: "6px",
  },
  rulesGrid: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },
  cat: { color: "#38bdf8" },
  csvLabel: {
    fontSize: "13px",
    color: "#94a3b8",
    marginBottom: "6px",
  },
  code: {
    padding: "2px 6px",
    background: "#0f172a",
    borderRadius: "4px",
    fontSize: "12px",
    color: "#e2e8f0",
  },
  textarea: {
    width: "100%",
    padding: "12px",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "6px",
    color: "#e2e8f0",
    fontFamily: "monospace",
    fontSize: "14px",
    resize: "vertical" as const,
  },
  button: {
    marginTop: "12px",
    padding: "8px 24px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
  },
  error: {
    marginTop: "12px",
    padding: "12px",
    background: "#7f1d1d",
    borderRadius: "6px",
    color: "#fca5a5",
  },
  log: {
    padding: "16px",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "6px",
    color: "#a5f3fc",
    fontFamily: "monospace",
    fontSize: "13px",
    whiteSpace: "pre-wrap" as const,
    maxHeight: "400px",
    overflowY: "auto" as const,
    marginBottom: "12px",
  },
  cmdRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  prompt: {
    color: "#38bdf8",
    fontFamily: "monospace",
    fontSize: "14px",
    whiteSpace: "nowrap" as const,
  },
  input: {
    flex: 1,
    padding: "8px 12px",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "6px",
    color: "#e2e8f0",
    fontFamily: "monospace",
    fontSize: "14px",
  },
  sendBtn: {
    padding: "8px 16px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
  },
  resetBtn: {
    marginTop: "12px",
    padding: "6px 16px",
    background: "transparent",
    border: "1px solid #475569",
    borderRadius: "6px",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "13px",
  },
};
