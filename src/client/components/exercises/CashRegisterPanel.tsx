import { useState, useRef } from "react";
import { useApi } from "../../hooks/useApi.js";
import { ContextBox, Lang, Stat, Code } from "../ContextBox.js";

interface Transaction {
  owed: string;
  paid: string;
}

/** Parse "3 quarters,1 dime,3 pennies" into structured denomination data */
function parseChangeLine(line: string): { name: string; count: number }[] {
  if (!line.trim()) return [];
  return line.split(",").map((part) => {
    const match = part.trim().match(/^(\d+)\s+(.+)$/);
    if (!match) return { name: part.trim(), count: 1 };
    return { count: Number(match[1]), name: match[2] };
  });
}

export function CashRegisterPanel() {
  const [transactions, setTransactions] = useState<Transaction[]>([
    { owed: "2.12", paid: "3.00" },
    { owed: "1.97", paid: "2.00" },
    { owed: "3.33", paid: "5.00" },
  ]);
  const [owed, setOwed] = useState("");
  const [paid, setPaid] = useState("");
  const paidRef = useRef<HTMLInputElement>(null);

  const { data, error, loading, call } = useApi<{ output: string }>();

  const addTransaction = () => {
    const o = parseFloat(owed);
    const p = parseFloat(paid);
    if (isNaN(o) || isNaN(p) || o <= 0 || p <= 0) return;
    if (p < o) return; // paid must be >= owed
    setTransactions((prev) => [...prev, { owed: o.toFixed(2), paid: p.toFixed(2) }]);
    setOwed("");
    setPaid("");
  };

  const removeTransaction = (index: number) => {
    setTransactions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRun = async () => {
    if (transactions.length === 0) return;
    const input = transactions.map((t) => `${t.owed},${t.paid}`).join("\n");
    await call("/api/exercises/cash-register", {
      method: "POST",
      body: JSON.stringify({ input }),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: "owed" | "paid") => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (field === "owed") {
        paidRef.current?.focus();
      } else {
        addTransaction();
      }
    }
  };

  // Parse output lines and pair with transactions
  const outputLines = data?.output ? data.output.split("\n") : [];

  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>Cash Register</h2>
      <p style={styles.desc}>
        Ring up transactions and get back the optimal change in bills and coins.
      </p>

      <ContextBox>
        <ContextBox.Section heading="Problem">
          Build a cash register that calculates optimal change using US coin and bill denominations.
          If the amount owed is divisible by 3, return a random (seeded) assortment instead of
          optimal change.
        </ContextBox.Section>
        <ContextBox.Section heading="Solution">
          <Lang>Rust</Lang>. Financial calculations demand zero-cost abstractions and type
          safety. All arithmetic uses integer cents to eliminate floating-point rounding bugs
          entirely. A trait-based strategy pattern (<Code>ChangeStrategy</Code>) cleanly separates
          the greedy optimal algorithm from the randomized path, making new strategies a one-file
          addition.
        </ContextBox.Section>
        <ContextBox.Section heading="Testing">
          <Stat>79 tests</Stat> covering exact change, overpayment with every denomination,
          the divisible-by-3 randomization path, penny-level precision, large amounts, zero-change
          edge cases, and round-trip verification that computed change always sums back to the
          correct amount.
        </ContextBox.Section>
      </ContextBox>

      {/* Add transaction form */}
      <div style={styles.addRow}>
        <div style={styles.inputGroup}>
          <label htmlFor="cash-owed" style={styles.inputLabel}>Owed</label>
          <div style={styles.dollarWrap}>
            <span style={styles.dollarSign}>$</span>
            <input
              id="cash-owed"
              type="number"
              step="0.01"
              min="0.01"
              value={owed}
              onChange={(e) => setOwed(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "owed")}
              placeholder="0.00"
              style={styles.dollarInput}
            />
          </div>
        </div>
        <div style={styles.inputGroup}>
          <label htmlFor="cash-paid" style={styles.inputLabel}>Paid</label>
          <div style={styles.dollarWrap}>
            <span style={styles.dollarSign}>$</span>
            <input
              id="cash-paid"
              ref={paidRef}
              type="number"
              step="0.01"
              min="0.01"
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "paid")}
              placeholder="0.00"
              style={styles.dollarInput}
            />
          </div>
        </div>
        <button
          onClick={addTransaction}
          style={styles.addBtn}
          disabled={!owed || !paid || parseFloat(paid) < parseFloat(owed)}
        >
          + Add
        </button>
      </div>

      {/* Transaction list */}
      {transactions.length > 0 && (
        <div style={styles.transactionList}>
          <div style={styles.listHeader}>
            <span style={styles.listHeaderLabel}>Transactions</span>
            <span style={styles.listCount}>{transactions.length}</span>
          </div>
          {transactions.map((t, i) => {
            const changeDue = (parseFloat(t.paid) - parseFloat(t.owed)).toFixed(2);
            const changeItems = outputLines[i] ? parseChangeLine(outputLines[i]) : null;
            return (
              <div key={i} style={styles.txRow}>
                <div style={styles.txAmounts}>
                  <span style={styles.txOwed}>${t.owed}</span>
                  <span style={styles.txArrow}>{"\u2192"}</span>
                  <span style={styles.txPaid}>${t.paid}</span>
                  <span style={styles.txChange}>${changeDue} change</span>
                </div>
                {changeItems ? (
                  <div style={styles.changeChips}>
                    {changeItems.map((d, j) => (
                      <span key={j} style={styles.chip}>
                        {d.count} {d.name}
                      </span>
                    ))}
                  </div>
                ) : null}
                {!data && (
                  <button
                    onClick={() => removeTransaction(i)}
                    style={styles.removeBtn}
                    aria-label="Remove transaction"
                    title="Remove"
                  >
                    {"\u00D7"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={styles.buttonRow}>
        <button
          onClick={handleRun}
          disabled={loading || transactions.length === 0}
          style={styles.runBtn}
        >
          {loading ? "Calculating..." : "Make Change"}
        </button>
        {data && (
          <button
            onClick={() => {
              setTransactions([]);
            }}
            style={styles.clearBtn}
          >
            Clear All
          </button>
        )}
      </div>

      {error && <div role="alert" style={styles.error}>{error}</div>}
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
  addRow: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-end",
    flexWrap: "wrap" as const,
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },
  inputLabel: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  },
  dollarWrap: {
    display: "flex",
    alignItems: "center",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    overflow: "hidden" as const,
  },
  dollarSign: {
    padding: "8px 0 8px 12px",
    color: "#64748b",
    fontSize: "14px",
    fontWeight: 600,
    userSelect: "none" as const,
  },
  dollarInput: {
    width: "100px",
    padding: "8px 12px 8px 4px",
    background: "transparent",
    border: "none",
    color: "#e2e8f0",
    fontSize: "14px",
    fontFamily: "monospace",
    outline: "none",
  },
  addBtn: {
    padding: "8px 18px",
    background: "transparent",
    border: "1px solid #475569",
    borderRadius: "8px",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
    marginBottom: "1px",
  },
  transactionList: {
    marginTop: "16px",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    overflow: "hidden" as const,
  },
  listHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    borderBottom: "1px solid #1e293b",
  },
  listHeaderLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  },
  listCount: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#38bdf8",
    background: "rgba(56, 189, 248, 0.1)",
    padding: "1px 8px",
    borderRadius: "10px",
  },
  txRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 16px",
    borderBottom: "1px solid rgba(30, 41, 59, 0.6)",
    flexWrap: "wrap" as const,
    position: "relative" as const,
  },
  txAmounts: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontFamily: "monospace",
    fontSize: "14px",
  },
  txOwed: {
    color: "#f87171",
    fontWeight: 600,
  },
  txArrow: {
    color: "#475569",
    fontSize: "12px",
  },
  txPaid: {
    color: "#4ade80",
    fontWeight: 600,
  },
  txChange: {
    color: "#64748b",
    fontSize: "12px",
    marginLeft: "4px",
  },
  changeChips: {
    display: "flex",
    gap: "4px",
    flexWrap: "wrap" as const,
  },
  chip: {
    display: "inline-block",
    padding: "2px 8px",
    background: "rgba(56, 189, 248, 0.1)",
    border: "1px solid rgba(56, 189, 248, 0.2)",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: 500,
    color: "#7dd3fc",
    whiteSpace: "nowrap" as const,
  },
  removeBtn: {
    position: "absolute" as const,
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    width: "24px",
    height: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    color: "#475569",
    cursor: "pointer",
    fontSize: "16px",
    borderRadius: "4px",
  },
  buttonRow: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    marginTop: "16px",
  },
  runBtn: {
    padding: "10px 28px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
  },
  clearBtn: {
    padding: "8px 16px",
    background: "transparent",
    border: "1px solid #475569",
    borderRadius: "8px",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
  },
  error: {
    marginTop: "12px",
    padding: "12px 14px",
    background: "#7f1d1d",
    borderRadius: "8px",
    color: "#fca5a5",
    fontSize: "13px",
  },
};
