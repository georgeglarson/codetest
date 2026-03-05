import type { Tab, TabId } from "../types/index.js";

const TABS: Tab[] = [
  { id: "overview", label: "Overview" },
  { id: "cash-register", label: "Cash Register" },
  { id: "missing-number", label: "Missing Number" },
  { id: "morse-code", label: "Morse Code" },
  { id: "on-screen-keyboard", label: "On-Screen Keyboard" },
  { id: "gilded-rose", label: "Gilded Rose" },
  { id: "reviews", label: "Restaurant Reviews" },
];

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TabNav({ activeTab, onTabChange }: Props) {
  return (
    <nav style={styles.nav} role="tablist" aria-label="Exercise panels">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            style={{
              ...styles.tab,
              ...(isActive ? styles.active : {}),
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex",
    gap: "2px",
    padding: "0 20px",
    background: "#1e293b",
    borderBottom: "1px solid #334155",
    flexWrap: "wrap" as const,
    position: "sticky" as const,
    top: 0,
    zIndex: 10,
  },
  tab: {
    padding: "12px 18px",
    border: "none",
    borderBottomWidth: "2px",
    borderBottomStyle: "solid" as const,
    borderBottomColor: "transparent",
    background: "transparent",
    color: "#64748b",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
    letterSpacing: "0.01em",
    whiteSpace: "nowrap" as const,
  },
  active: {
    color: "#f1f5f9",
    borderBottomColor: "#38bdf8",
  },
};
