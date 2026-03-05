import React, { useState } from "react";
import type { TabId } from "./types/index.js";
import { TabNav } from "./components/TabNav.js";
import { OverviewPanel } from "./components/OverviewPanel.js";
import { ReviewsPanel } from "./components/reviews/ReviewsPanel.js";
import { CashRegisterPanel } from "./components/exercises/CashRegisterPanel.js";
import { MissingNumberPanel } from "./components/exercises/MissingNumberPanel.js";
import { MorseCodePanel } from "./components/exercises/MorseCodePanel.js";
import { OnScreenKeyboardPanel } from "./components/exercises/OnScreenKeyboardPanel.js";
import { GildedRosePanel } from "./components/exercises/GildedRosePanel.js";

const PANELS: Record<Exclude<TabId, "overview">, React.ComponentType> = {
  "cash-register": CashRegisterPanel,
  "missing-number": MissingNumberPanel,
  "morse-code": MorseCodePanel,
  "on-screen-keyboard": OnScreenKeyboardPanel,
  "gilded-rose": GildedRosePanel,
  reviews: ReviewsPanel,
};

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div style={styles.shell}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.h1}>TrueFit Code Challenge</h1>
          <span style={styles.subtitle}>6 exercises &middot; 6 languages &middot; 960+ tests</span>
        </div>
        <a
          href="https://github.com/georgeglarson/truefit"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.repoLink}
          title="View source on GitHub"
        >
          <svg style={styles.githubIcon} viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          Source
        </a>
      </header>
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
      <main style={styles.main}>
        {activeTab === "overview" ? (
          <OverviewPanel onNavigate={setActiveTab} />
        ) : (
          React.createElement(PANELS[activeTab])
        )}
      </main>
    </div>
  );
}

const styles = {
  shell: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column" as const,
  },
  header: {
    padding: "20px 28px 16px",
    background: "#1e293b",
    borderBottom: "1px solid #334155",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap" as const,
    gap: "12px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "baseline",
    gap: "16px",
    flexWrap: "wrap" as const,
  },
  h1: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#f1f5f9",
    letterSpacing: "-0.01em",
  },
  subtitle: {
    fontSize: "13px",
    color: "#64748b",
    fontWeight: 400,
  },
  repoLink: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#94a3b8",
    fontSize: "13px",
    fontWeight: 500,
    textDecoration: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid #334155",
    transition: "color 0.15s, border-color 0.15s",
  },
  githubIcon: {
    width: "16px",
    height: "16px",
  },
  main: {
    flex: 1,
    maxWidth: "960px",
    width: "100%",
    margin: "0 auto",
    padding: "8px 0",
  },
};
