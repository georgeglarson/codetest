import { useState, useRef } from "react";
import { useApi } from "../../hooks/useApi.js";
import { ContextBox, Lang, Stat, Code } from "../ContextBox.js";

const DEFAULT_INVENTORY = `Aged Brie,Aged,2,0
Elixir of the Mongoose,Normal,5,7
Sulfuras Hand of Ragnaros,Legendary,0,80
Backstage passes to a TAFKAL80ETC concert,BackstagePass,15,20
Conjured Mana Cake,Conjured,3,6`;

interface Item {
  name: string;
  category: string;
  sellIn: number;
  quality: number;
}

const ITEM_RE = /^\s*(.+?)\s+\((\w+)\)\s*—\s*SellIn:\s*(-?\d+),\s*Quality:\s*(\d+)/;

function parseItems(text: string): Item[] {
  return text
    .split("\n")
    .map((line) => {
      const m = line.match(ITEM_RE);
      if (!m) return null;
      return { name: m[1], category: m[2], sellIn: Number(m[3]), quality: Number(m[4]) };
    })
    .filter((x): x is Item => x !== null);
}

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  Normal: { bg: "rgba(148, 163, 184, 0.15)", color: "#94a3b8" },
  Aged: { bg: "rgba(74, 222, 128, 0.15)", color: "#4ade80" },
  Legendary: { bg: "rgba(251, 191, 36, 0.15)", color: "#fbbf24" },
  BackstagePass: { bg: "rgba(168, 85, 247, 0.15)", color: "#a855f7" },
  Conjured: { bg: "rgba(248, 113, 113, 0.15)", color: "#f87171" },
};

function CatBadge({ category }: { category: string }) {
  const c = CAT_COLORS[category] ?? CAT_COLORS.Normal;
  return <span style={{ ...styles.catBadge, background: c.bg, color: c.color }}>{category}</span>;
}

function QualityBar({ quality, max }: { quality: number; max: number }) {
  const pct = Math.min(100, (quality / max) * 100);
  let color = "#38bdf8";
  if (quality <= 0) color = "#475569";
  else if (quality <= 10) color = "#f87171";
  else if (quality <= 25) color = "#fbbf24";
  return (
    <div style={styles.qualityBarOuter}>
      <div style={{ ...styles.qualityBarInner, width: `${pct}%`, background: color }} />
      <span style={styles.qualityBarLabel}>{quality}</span>
    </div>
  );
}

function Delta({ prev, curr }: { prev: number; curr: number }) {
  const diff = curr - prev;
  if (diff === 0) return <span style={{ color: "#475569" }}>&mdash;</span>;
  const color = diff > 0 ? "#4ade80" : "#f87171";
  const arrow = diff > 0 ? "\u2191" : "\u2193";
  return (
    <span style={{ color, fontWeight: 600, fontFamily: "monospace" }}>
      {arrow}
      {Math.abs(diff)}
    </span>
  );
}

export function GildedRosePanel() {
  const [inventory, setInventory] = useState(DEFAULT_INVENTORY);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [day, setDay] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const prevItems = useRef<Item[]>([]);
  const [advancing, setAdvancing] = useState(false);

  const startApi = useApi<{ sessionId: string; day: number }>();
  const cmdApi = useApi<{ output: string; day: number }>();

  const sendCommand = async (sid: string, command: string) => {
    return await cmdApi.call(`/api/exercises/gilded-rose/${sid}/command`, {
      method: "POST",
      body: JSON.stringify({ command }),
    });
  };

  const handleStart = async () => {
    if (!inventory.trim()) return;
    const result = await startApi.call("/api/exercises/gilded-rose/start", {
      method: "POST",
      body: JSON.stringify({ inventory }),
    });
    if (result) {
      setSessionId(result.sessionId);
      setDay(result.day);
      // Immediately fetch item list
      const listResult = await cmdApi.call(
        `/api/exercises/gilded-rose/${result.sessionId}/command`,
        { method: "POST", body: JSON.stringify({ command: "list" }) }
      );
      if (listResult) {
        const parsed = parseItems(listResult.output);
        setItems(parsed);
        prevItems.current = parsed;
      }
    }
  };

  const handleNextDay = async () => {
    if (!sessionId) return;
    setAdvancing(true);
    const nextResult = await sendCommand(sessionId, "next");
    if (nextResult) {
      setDay(nextResult.day);
      const listResult = await sendCommand(sessionId, "list");
      if (listResult) {
        prevItems.current = items;
        setItems(parseItems(listResult.output));
      }
    }
    setAdvancing(false);
  };

  const handleEnd = () => {
    if (sessionId) {
      fetch(`/api/exercises/gilded-rose/${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }).catch(() => {});
    }
    setSessionId(null);
    setItems([]);
    prevItems.current = [];
    setDay(0);
  };

  const qualityMaxFor = (category: string) => (category === "Legendary" ? 80 : 50);

  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>Gilded Rose</h2>
      <p style={styles.desc}>
        A shop inventory simulator. Items degrade (or improve) in Quality each day according to
        category rules. Load an inventory, then advance days to watch the rules play out.
      </p>

      <ContextBox>
        <ContextBox.Section heading="Problem">
          Implement a system where shop inventory items degrade (or improve) in Quality each day
          according to category-specific rules across 5 item types, each with unique aging
          behavior.
        </ContextBox.Section>
        <ContextBox.Section heading="Solution">
          <Lang>Go</Lang>. Go's interface system is a natural fit. Each item category
          implements a single <Code>Updater</Code> interface, and a registry pattern makes adding
          new item rules a one-file addition. Go's simplicity forces clean design without hiding
          behind language features.
        </ContextBox.Section>
        <ContextBox.Section heading="Testing">
          <Stat>82 tests</Stat> covering all 5 category rules (Normal, Aged, Legendary,
          BackstagePass, Conjured), boundary conditions at Quality 0 and 50, SellIn expiration
          behavior, multi-day progression, and edge cases like negative SellIn values.
        </ContextBox.Section>
      </ContextBox>

      {!sessionId ? (
        <>
          <div style={styles.rulesBox}>
            <div style={styles.rulesTitle}>Category Rules</div>
            <div style={styles.rulesGrid}>
              <div>
                <CatBadge category="Normal" /> Quality drops by 1/day, doubles after SellIn expires
              </div>
              <div>
                <CatBadge category="Aged" /> Quality <em>increases</em> by 1/day (better with age)
              </div>
              <div>
                <CatBadge category="Legendary" /> Never sold, never degrades (Quality stays 80)
              </div>
              <div>
                <CatBadge category="BackstagePass" /> Quality rises as concert nears: +2 at 10d, +3
                at 5d, drops to 0 after
              </div>
              <div>
                <CatBadge category="Conjured" /> Degrades twice as fast as Normal items
              </div>
            </div>
            <div style={styles.rulesNote}>
              Quality is always 0&ndash;50 (except Legendary at 80).
            </div>
          </div>
          <div style={styles.csvLabel}>
            Inventory CSV, one item per line:{" "}
            <code style={styles.code}>Name,Category,SellIn,Quality</code>
          </div>
          <textarea
            value={inventory}
            onChange={(e) => setInventory(e.target.value)}
            rows={8}
            style={styles.textarea}
            aria-label="Inventory CSV"
          />
          <button onClick={handleStart} disabled={startApi.loading} style={styles.startBtn}>
            {startApi.loading ? "Starting..." : "Start Simulation"}
          </button>
          {startApi.error && <div role="alert" style={styles.error}>{startApi.error}</div>}
        </>
      ) : (
        <>
          <div style={styles.dayBar}>
            <div style={styles.dayLabel}>Day {day}</div>
            <button onClick={handleNextDay} disabled={advancing} style={styles.nextDayBtn}>
              {advancing ? "Advancing..." : "Next Day \u2192"}
            </button>
            <button onClick={handleEnd} style={styles.endBtn}>
              End
            </button>
          </div>

          {cmdApi.error && <div role="alert" style={styles.error}>{cmdApi.error}</div>}

          <table style={styles.table}>
            <thead>
              <tr>
                <th scope="col" style={styles.th}>Item</th>
                <th scope="col" style={styles.th}>Category</th>
                <th scope="col" style={{ ...styles.th, textAlign: "right" }}>SellIn</th>
                <th scope="col" style={styles.th}>Quality</th>
                <th scope="col" style={{ ...styles.th, textAlign: "center", width: "50px" }}>{"\u0394"}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const prev = prevItems.current[i];
                const expired = item.sellIn < 0;
                const dead = item.quality <= 0 && item.category !== "Legendary";
                return (
                  <tr key={`${item.name}-${i}`} style={dead ? { opacity: 0.4 } : undefined}>
                    <td style={styles.td}>
                      <span style={dead ? { textDecoration: "line-through" } : undefined}>
                        {item.name}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <CatBadge category={item.category} />
                    </td>
                    <td style={{ ...styles.td, textAlign: "right", fontFamily: "monospace" }}>
                      <span style={{ color: expired ? "#f87171" : "#94a3b8" }}>{item.sellIn}</span>
                    </td>
                    <td style={styles.td}>
                      <QualityBar quality={item.quality} max={qualityMaxFor(item.category)} />
                    </td>
                    <td style={{ ...styles.td, textAlign: "center" }}>
                      {prev ? (
                        <Delta prev={prev.quality} curr={item.quality} />
                      ) : (
                        <span style={{ color: "#475569" }}>&mdash;</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

const styles = {
  panel: { padding: "28px 32px" },
  title: {
    fontSize: "22px",
    fontWeight: 700,
    marginBottom: "6px",
    color: "#f1f5f9",
    letterSpacing: "-0.01em",
  },
  desc: {
    color: "#94a3b8",
    marginBottom: "20px",
    fontSize: "14px",
    lineHeight: 1.6,
  },
  rulesBox: {
    padding: "14px 18px",
    background: "linear-gradient(135deg, #1e293b 0%, #1a2536 100%)",
    border: "1px solid #334155",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "13px",
    color: "#cbd5e1",
    lineHeight: 1.9,
  },
  rulesTitle: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    marginBottom: "6px",
  },
  rulesGrid: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },
  rulesNote: {
    marginTop: "8px",
    color: "#64748b",
    fontSize: "12px",
  },
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
    fontFamily: "monospace",
  },
  textarea: {
    width: "100%",
    padding: "12px 14px",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#e2e8f0",
    fontFamily: "monospace",
    fontSize: "14px",
    resize: "vertical" as const,
    lineHeight: 1.5,
  },
  startBtn: {
    marginTop: "12px",
    padding: "10px 28px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
  },
  error: {
    marginTop: "12px",
    padding: "12px 14px",
    background: "#7f1d1d",
    borderRadius: "8px",
    color: "#fca5a5",
    fontSize: "13px",
  },

  // Session view
  dayBar: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
    padding: "14px 18px",
    background: "#1e293b",
    borderRadius: "8px",
    border: "1px solid #334155",
  },
  dayLabel: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#f1f5f9",
    fontFamily: "monospace",
    minWidth: "80px",
  },
  nextDayBtn: {
    padding: "10px 24px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
  },
  endBtn: {
    marginLeft: "auto",
    padding: "8px 18px",
    background: "transparent",
    border: "1px solid #475569",
    borderRadius: "8px",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
  },

  // Table
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "13px",
  },
  th: {
    textAlign: "left" as const,
    padding: "10px 12px 8px",
    borderBottom: "1px solid #475569",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid rgba(51, 65, 85, 0.4)",
    color: "#cbd5e1",
    verticalAlign: "middle" as const,
  },
  catBadge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.02em",
    whiteSpace: "nowrap" as const,
  },
  qualityBarOuter: {
    position: "relative" as const,
    width: "120px",
    height: "20px",
    background: "#0f172a",
    borderRadius: "4px",
    overflow: "hidden" as const,
  },
  qualityBarInner: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    height: "100%",
    borderRadius: "4px",
    opacity: 0.6,
  },
  qualityBarLabel: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: 600,
    fontFamily: "monospace",
    color: "#e2e8f0",
  },
};
