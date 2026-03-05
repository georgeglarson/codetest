import { useState } from "react";
import { useApi } from "../../hooks/useApi.js";
import { useMorseAudio, parseMorseTokens } from "../../hooks/useMorseAudio.js";
import { ContextBox, Lang, Stat } from "../ContextBox.js";

export function MorseCodePanel() {
  const [input, setInput] = useState("HELLO WORLD");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const { data, error, loading, call } = useApi<{ output: string }>();
  const audio = useMorseAudio();

  const handleRun = async () => {
    if (!input.trim()) return;
    audio.stop();
    await call(`/api/exercises/morse-code/${mode}`, {
      method: "POST",
      body: JSON.stringify({ input }),
    });
  };

  const handleSwap = () => {
    if (!data?.output) return;
    audio.stop();
    const newMode = mode === "encode" ? "decode" : "encode";
    setInput(data.output);
    setMode(newMode);
  };

  // Only offer audio playback when we have morse output (encode mode result)
  const morseOutput = mode === "encode" && data?.output ? data.output : null;

  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>Morse Code</h2>
      <p style={styles.desc}>
        Convert between plain text and Morse code. Type a message to translate it, or paste Morse
        code to read it back.
      </p>

      <ContextBox>
        <ContextBox.Section heading="Problem">
          Build a two-way Morse code translator (text to Morse and back again),
          including multi-word messages with proper delimiter hierarchy.
        </ContextBox.Section>
        <ContextBox.Section heading="Solution">
          <Lang>Perl</Lang>. A text-processing problem at its core: splitting on
          delimiters and mapping through a lookup table. Perl is <em>the</em> language for this
          domain. The solution uses a three-tier delimiter hierarchy (dot for signals, pipe-pair for
          letters, quad-pipe for words) and builds both encoder and decoder from a single
          authoritative lookup table.
        </ContextBox.Section>
        <ContextBox.Section heading="Testing">
          <Stat>200 tests</Stat> covering every letter A&ndash;Z, digits 0&ndash;9, all
          supported punctuation, multi-word encoding/decoding, full round-trip verification (encode
          then decode returns original), edge cases like empty input, unknown characters, and
          malformed Morse sequences.
        </ContextBox.Section>
      </ContextBox>

      <div style={styles.modeToggle}>
        <button
          onClick={() => {
            if (mode === "encode") return;
            audio.stop();
            setMode("encode");
            if (data?.output) setInput(data.output);
            else setInput("HELLO WORLD");
          }}
          style={{
            ...styles.modeBtn,
            ...(mode === "encode" ? styles.modeActive : {}),
          }}
        >
          Text to Morse
        </button>
        <button
          onClick={() => {
            if (mode === "decode") return;
            audio.stop();
            setMode("decode");
            if (data?.output) setInput(data.output);
            else setInput("");
          }}
          style={{
            ...styles.modeBtn,
            ...(mode === "decode" ? styles.modeActive : {}),
          }}
        >
          Morse to Text
        </button>
      </div>

      {mode === "decode" && (
        <p style={styles.hint}>
          Separate letters with <code style={styles.code}>||</code> and words with{" "}
          <code style={styles.code}>||||</code>
        </p>
      )}
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={
          mode === "encode" ? "HELLO WORLD" : "....||.||.-..||.-..||---||||.--||---||.-.||.-..||-.."
        }
        rows={6}
        style={styles.textarea}
        aria-label={mode === "encode" ? "Text to encode" : "Morse code to decode"}
      />

      <div style={styles.buttonRow}>
        <button onClick={handleRun} disabled={loading} style={styles.button}>
          {loading ? "Converting..." : "Convert"}
        </button>
        {data?.output && (
          <button onClick={handleSwap} style={styles.swapBtn}>
            {mode === "encode" ? "Reverse it \u2192" : "\u2190 Reverse it"}
          </button>
        )}
      </div>

      {error && <div role="alert" style={styles.error}>{error}</div>}

      {data && (
        <div style={styles.outputWrap}>
          {morseOutput && (
            <div style={styles.audioBar}>
              {audio.playing ? (
                <button
                  onClick={() => audio.stop()}
                  style={styles.audioBtn}
                  aria-label="Stop playback"
                  title="Stop"
                >
                  {"\u23F9"}
                </button>
              ) : (
                <button
                  onClick={() => audio.play(morseOutput)}
                  style={styles.audioBtn}
                  aria-label="Play Morse audio"
                  title="Play Morse audio"
                >
                  {"\uD83D\uDD0A"}
                </button>
              )}
              <span style={styles.audioHint}>
                {audio.playing ? "Playing..." : "Tap to hear it"}
              </span>
            </div>
          )}
          {morseOutput && audio.playing ? (
            <MorseHighlight morse={morseOutput} tokenIndex={audio.tokenIndex} />
          ) : (
            <pre role="status" aria-live="polite" style={styles.output}>{data.output}</pre>
          )}
        </div>
      )}
    </div>
  );
}

/** Renders morse output with the active letter highlighted during playback */
function MorseHighlight({ morse, tokenIndex }: { morse: string; tokenIndex: number }) {
  const tokens = parseMorseTokens(morse);

  // Build spans from tokens, mapping back to display text with delimiters
  const spans: { text: string; active: boolean }[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === "word-gap") {
      spans.push({ text: "||||", active: i === tokenIndex });
    } else {
      if (i > 0 && tokens[i - 1].type === "letter") {
        spans.push({ text: "||", active: false });
      }
      spans.push({ text: token.raw, active: i === tokenIndex });
    }
  }

  return (
    <pre style={styles.output}>
      {spans.map((s, i) => (
        <span
          key={i}
          style={
            s.active
              ? { color: "#22d3ee", textShadow: "0 0 8px rgba(34, 211, 238, 0.5)" }
              : undefined
          }
        >
          {s.text}
        </span>
      ))}
    </pre>
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
  modeToggle: {
    display: "flex",
    gap: "4px",
    marginBottom: "12px",
  },
  modeBtn: {
    padding: "8px 20px",
    border: "1px solid #334155",
    borderRadius: "8px",
    background: "transparent",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
  },
  hint: {
    fontSize: "12px",
    color: "#64748b",
    marginBottom: "8px",
    lineHeight: 1.5,
  },
  code: {
    padding: "2px 6px",
    background: "#0f172a",
    borderRadius: "4px",
    fontSize: "11px",
    color: "#e2e8f0",
    fontFamily: "monospace",
  },
  modeActive: {
    background: "#1e40af",
    color: "#fff",
    borderColor: "#2563eb",
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
  buttonRow: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    marginTop: "12px",
  },
  button: {
    padding: "10px 28px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
  },
  swapBtn: {
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
  outputWrap: {
    marginTop: "16px",
  },
  audioBar: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
  },
  audioBtn: {
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#1e293b",
    border: "1px solid #475569",
    borderRadius: "8px",
    color: "#e2e8f0",
    cursor: "pointer",
    fontSize: "18px",
  },
  audioHint: {
    fontSize: "12px",
    color: "#64748b",
    fontStyle: "italic" as const,
  },
  output: {
    margin: 0,
    padding: "16px",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#a5f3fc",
    fontFamily: "monospace",
    fontSize: "14px",
    whiteSpace: "pre-wrap" as const,
    lineHeight: 1.5,
  },
};
