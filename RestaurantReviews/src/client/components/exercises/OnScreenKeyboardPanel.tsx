import { useState, useEffect, useRef, useCallback } from "react";
import { useApi } from "../../hooks/useApi.js";
import { ContextBox, Lang, Stat } from "../ContextBox.js";

const LAYOUT = ["ABCDEF", "GHIJKL", "MNOPQR", "STUVWX", "YZ1234", "567890"];

interface Step {
  row: number;
  col: number;
  move: string;
  selected: string | null; // character selected on '#', or null
  isSpace: boolean;
}

function parseSteps(output: string): Step[] {
  const moves = output.split(",").map((s) => s.trim());
  const steps: Step[] = [];
  let row = 0;
  let col = 0;

  // initial position (before any moves)
  steps.push({ row, col, move: "start", selected: null, isSpace: false });

  for (const m of moves) {
    if (m === "U") row = Math.max(0, row - 1);
    else if (m === "D") row = Math.min(5, row + 1);
    else if (m === "L") col = Math.max(0, col - 1);
    else if (m === "R") col = Math.min(5, col + 1);
    else if (m === "#") {
      steps.push({ row, col, move: "#", selected: LAYOUT[row][col], isSpace: false });
      continue;
    } else if (m === "S") {
      steps.push({ row, col, move: "S", selected: null, isSpace: true });
      continue;
    } else continue;

    steps.push({ row, col, move: m, selected: null, isSpace: false });
  }
  return steps;
}

function KeyboardViz({ output }: { output: string }) {
  const steps = useRef(parseSteps(output));
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(200);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSteps = steps.current.length;
  const current = steps.current[stepIdx];

  // Build the "typed so far" string and set of visited cells
  const pastSteps = steps.current.slice(0, stepIdx + 1);
  const typed = pastSteps.reduce((acc, st) => {
    if (st.selected) return acc + st.selected;
    if (st.isSpace) return acc + " ";
    return acc;
  }, "");

  // Track which cells have been selected (not including current step)
  const visitedCells = new Set<string>();
  for (let i = 0; i < stepIdx; i++) {
    const st = steps.current[i];
    if (st.selected) visitedCells.add(`${st.row},${st.col}`);
  }

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPlaying(false);
  }, []);

  const play = useCallback(() => {
    stop();
    setPlaying(true);
    timerRef.current = setInterval(() => {
      setStepIdx((prev) => {
        if (prev >= totalSteps - 1) {
          stop();
          return prev;
        }
        return prev + 1;
      });
    }, speed);
  }, [speed, totalSteps, stop]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Restart animation when speed changes while playing
  useEffect(() => {
    if (playing) play();
  }, [speed]);

  // Reset when output changes
  useEffect(() => {
    stop();
    steps.current = parseSteps(output);
    setStepIdx(0);
  }, [output, stop]);

  const reset = () => {
    stop();
    setStepIdx(0);
  };

  const stepForward = () => {
    if (stepIdx < totalSteps - 1) setStepIdx((p) => p + 1);
  };

  const stepBack = () => {
    if (stepIdx > 0) setStepIdx((p) => p - 1);
  };

  return (
    <div style={s.vizContainer}>
      {/* Typed output */}
      <div style={s.typedRow}>
        <span style={s.typedLabel}>Output:</span>
        <span style={s.typedText}>
          {typed ? (
            typed.split("").map((ch, i) =>
              ch === " " ? (
                <span key={i} style={s.spaceChar}>{"\u2423"}</span>
              ) : (
                <span key={i}>{ch}</span>
              )
            )
          ) : (
            <span style={s.typedPlaceholder}>_</span>
          )}
          <span style={s.cursor}>|</span>
        </span>
      </div>

      {/* Keyboard grid */}
      <div style={s.grid}>
        {LAYOUT.map((row, ri) => (
          <div key={ri} style={s.gridRow}>
            {row.split("").map((ch, ci) => {
              const isCursor = current.row === ri && current.col === ci;
              const isJustSelected = isCursor && current.selected === ch;
              const wasVisited = visitedCells.has(`${ri},${ci}`);
              return (
                <div
                  key={ci}
                  style={{
                    ...s.cell,
                    ...(wasVisited && !isCursor ? s.cellVisited : {}),
                    ...(isCursor ? s.cellCursor : {}),
                    ...(isJustSelected ? s.cellSelected : {}),
                  }}
                >
                  {ch}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Current move indicator */}
      <div style={s.moveIndicator}>
        {current.move === "start" && "Cursor at A — ready"}
        {current.move === "U" && "\u2191 Up"}
        {current.move === "D" && "\u2193 Down"}
        {current.move === "L" && "\u2190 Left"}
        {current.move === "R" && "\u2192 Right"}
        {current.move === "#" && <><span style={{ color: "#22d3ee" }}>Select</span>{` "${current.selected}"`}</>}
        {current.move === "S" && <span style={{ color: "#fbbf24" }}>{"\u2423"} Space</span>}
        <span style={s.stepCount}>{stepIdx}/{totalSteps - 1}</span>
      </div>

      {/* Controls */}
      <div style={s.controls}>
        <button onClick={reset} style={s.ctrlBtn} title="Reset">
          {"\u23EE"}
        </button>
        <button onClick={stepBack} style={s.ctrlBtn} disabled={stepIdx === 0} title="Step back">
          {"\u23EA"}
        </button>
        {playing ? (
          <button onClick={stop} style={s.ctrlBtnPrimary} title="Pause">
            {"\u23F8"}
          </button>
        ) : (
          <button onClick={play} style={s.ctrlBtnPrimary} disabled={stepIdx >= totalSteps - 1} title="Play">
            {"\u25B6"}
          </button>
        )}
        <button onClick={stepForward} style={s.ctrlBtn} disabled={stepIdx >= totalSteps - 1} title="Step forward">
          {"\u23E9"}
        </button>
        <div style={s.speedGroup}>
          <button
            onClick={() => setSpeed(400)}
            style={{ ...s.speedBtn, ...(speed === 400 ? s.speedActive : {}) }}
          >
            0.5x
          </button>
          <button
            onClick={() => setSpeed(200)}
            style={{ ...s.speedBtn, ...(speed === 200 ? s.speedActive : {}) }}
          >
            1x
          </button>
          <button
            onClick={() => setSpeed(80)}
            style={{ ...s.speedBtn, ...(speed === 80 ? s.speedActive : {}) }}
          >
            2x
          </button>
          <button
            onClick={() => setSpeed(30)}
            style={{ ...s.speedBtn, ...(speed === 30 ? s.speedActive : {}) }}
          >
            5x
          </button>
        </div>
      </div>
    </div>
  );
}

export function OnScreenKeyboardPanel() {
  const [input, setInput] = useState("IT Crowd");
  const { data, error, loading, call } = useApi<{ output: string }>();

  const handleRun = async () => {
    if (!input.trim()) return;
    await call("/api/exercises/on-screen-keyboard", {
      method: "POST",
      body: JSON.stringify({ input }),
    });
  };

  return (
    <div style={s.panel}>
      <h2 style={s.title}>On-Screen Keyboard</h2>
      <p style={s.desc}>
        Enter words (one per line) to get the cursor path on a TV-style remote
        keyboard. The visualizer below replays each move so you can verify the
        path is correct.
      </p>

      <ContextBox>
        <ContextBox.Section heading="Problem">
          Simulate a TV/DVR on-screen keyboard where a cursor starts at 'A' and moves
          Up/Down/Left/Right to spell words. Output the minimal sequence of moves and
          selections (U, D, L, R, S) for each input word.
        </ContextBox.Section>
        <ContextBox.Section heading="Solution">
          <Lang>Python</Lang> &mdash; If this were production code, it would be scripting device
          input on a smart TV &mdash; a space where Python dominates. The layout is modeled as data
          (a list of row strings) with an index dict for O(1) character lookups. Manhattan distance
          cursor movement keeps the algorithm clean and extensible to different keyboard layouts.
        </ContextBox.Section>
        <ContextBox.Section heading="Testing">
          <Stat>73 tests</Stat> &mdash; covers single characters, full words, phrases with spaces,
          wraparound edge cases, every character on the keyboard, multi-word input, and output format
          verification. Tests validate both the move sequence and final cursor position.
        </ContextBox.Section>
      </ContextBox>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="words to spell"
        rows={3}
        style={s.textarea}
      />

      <button onClick={handleRun} disabled={loading} style={s.button}>
        {loading ? "Running..." : "Run"}
      </button>

      {error && <div style={s.error}>{error}</div>}

      {data && (
        <>
          <KeyboardViz output={data.output} />
          <details style={s.rawDetails}>
            <summary style={s.rawSummary}>Raw output</summary>
            <pre style={s.rawOutput}>{data.output}</pre>
          </details>
        </>
      )}
    </div>
  );
}

const s = {
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
  button: {
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

  // Visualizer
  vizContainer: {
    marginTop: "20px",
    padding: "20px",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
  },
  typedRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
  },
  typedLabel: {
    fontSize: "12px",
    color: "#64748b",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  typedText: {
    fontFamily: "monospace",
    fontSize: "20px",
    color: "#f1f5f9",
    letterSpacing: "2px",
    fontWeight: 600,
  },
  typedPlaceholder: {
    color: "#334155",
  },
  spaceChar: {
    color: "#475569",
    margin: "0 1px",
  },
  cursor: {
    color: "#38bdf8",
    animation: "blink 1s step-end infinite",
  },
  grid: {
    display: "inline-flex",
    flexDirection: "column" as const,
    gap: "3px",
    marginBottom: "14px",
  },
  gridRow: {
    display: "flex",
    gap: "3px",
  },
  cell: {
    width: "44px",
    height: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "6px",
    color: "#94a3b8",
    fontFamily: "monospace",
    fontSize: "16px",
    fontWeight: 600,
    transition: "all 0.12s ease",
  },
  cellVisited: {
    background: "#1a2e3d",
    borderColor: "#2d4a5c",
    color: "#5eaac0",
  },
  cellCursor: {
    background: "#1e3a5f",
    borderColor: "#38bdf8",
    color: "#38bdf8",
    boxShadow: "0 0 8px rgba(56, 189, 248, 0.3)",
  },
  cellSelected: {
    background: "#164e63",
    borderColor: "#22d3ee",
    color: "#22d3ee",
    boxShadow: "0 0 12px rgba(34, 211, 238, 0.4)",
  },
  moveIndicator: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    color: "#94a3b8",
    marginBottom: "12px",
    fontFamily: "monospace",
  },
  stepCount: {
    marginLeft: "auto",
    fontSize: "12px",
    color: "#475569",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap" as const,
  },
  ctrlBtn: {
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "1px solid #475569",
    borderRadius: "6px",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "16px",
  },
  ctrlBtnPrimary: {
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#2563eb",
    border: "none",
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
    fontSize: "16px",
  },
  speedGroup: {
    display: "flex",
    gap: "2px",
    marginLeft: "12px",
  },
  speedBtn: {
    padding: "4px 10px",
    background: "transparent",
    border: "1px solid #334155",
    borderRadius: "4px",
    color: "#64748b",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 500,
  },
  speedActive: {
    background: "#1e40af",
    borderColor: "#2563eb",
    color: "#fff",
  },
  rawDetails: {
    marginTop: "12px",
  },
  rawSummary: {
    fontSize: "12px",
    color: "#475569",
    cursor: "pointer",
    padding: "4px 0",
  },
  rawOutput: {
    marginTop: "8px",
    padding: "12px",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#a5f3fc",
    fontFamily: "monospace",
    fontSize: "13px",
    whiteSpace: "pre-wrap" as const,
    lineHeight: 1.5,
  },
};
