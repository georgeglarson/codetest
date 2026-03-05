import type { TabId } from "../types/index.js";

const EXERCISES: {
  id: TabId;
  name: string;
  lang: string;
  color: string;
  why: string;
  tests: number;
}[] = [
  {
    id: "cash-register",
    name: "Cash Register",
    lang: "Rust",
    color: "#f87171",
    why: "Financial calculations demand zero-cost abstractions and type safety. Integer-cent arithmetic eliminates floating-point rounding.",
    tests: 94,
  },
  {
    id: "missing-number",
    name: "Missing Number",
    lang: "Zig",
    color: "#fbbf24",
    why: "A tight algorithmic problem suited to a systems language. Explicit allocator model and comptime features shine on performance-sensitive code.",
    tests: 70,
  },
  {
    id: "morse-code",
    name: "Morse Code",
    lang: "Perl",
    color: "#4ade80",
    why: "A text-processing problem at its core \u2014 splitting on delimiters and mapping through a lookup table. Perl is the language for this domain.",
    tests: 232,
  },
  {
    id: "on-screen-keyboard",
    name: "On-Screen Keyboard",
    lang: "Python",
    color: "#38bdf8",
    why: "Scripting device input on a smart TV \u2014 a space where Python dominates. Clean data modeling makes the solution readable and extensible.",
    tests: 94,
  },
  {
    id: "gilded-rose",
    name: "Gilded Rose",
    lang: "Go",
    color: "#a78bfa",
    why: "An OOP/business logic problem centered on polymorphism. Go\u2019s interface system is a natural fit for the strategy pattern.",
    tests: 107,
  },
  {
    id: "reviews",
    name: "Restaurant Reviews",
    lang: "TypeScript / React",
    color: "#38bdf8",
    why: "TrueFit\u2019s core stack. The most substantial exercise doubles as the unified control panel integrating all 5 other exercises as live panels.",
    tests: 371,
  },
];

const TOTAL_TESTS = EXERCISES.reduce((sum, e) => sum + e.tests, 0);

interface Props {
  onNavigate: (tab: TabId) => void;
}

export function OverviewPanel({ onNavigate }: Props) {
  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>Overview</h2>
      <p style={styles.desc}>
        Six exercises, six languages, each chosen to match the problem domain.
        Every exercise says to approach it as part of a larger system &mdash; this dashboard is
        that system.
      </p>

      <div style={styles.philosophy}>
        <div style={styles.philHeading}>Philosophy</div>
        <p style={styles.philText}>
          Language choice is a design decision, not a default. Each exercise below uses the language
          that best fits its problem domain &mdash; from Rust&rsquo;s zero-cost abstractions for
          financial math to Perl&rsquo;s text-processing dominance for Morse code. The goal is to
          demonstrate breadth and the ability to pick the right tool for the job.
        </p>
        <p style={styles.philText}>
          Single Responsibility Principle is enforced throughout &mdash; parsing, logic,
          orchestration, and I/O are always in separate modules. Test suites are exhaustive enough
          that a reviewer has nothing left to question.
        </p>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th scope="col" style={styles.th}>Exercise</th>
              <th scope="col" style={styles.th}>Language</th>
              <th scope="col" style={styles.th}>Why This Language</th>
              <th scope="col" style={{ ...styles.th, textAlign: "right" }}>Tests</th>
            </tr>
          </thead>
          <tbody>
            {EXERCISES.map((ex) => (
              <tr key={ex.id}>
                <td style={styles.td}>
                  <button
                    onClick={() => onNavigate(ex.id)}
                    style={styles.exLink}
                  >
                    {ex.name}
                  </button>
                </td>
                <td style={styles.td}>
                  <span style={{ ...styles.langBadge, color: ex.color, borderColor: ex.color }}>
                    {ex.lang}
                  </span>
                </td>
                <td style={{ ...styles.td, color: "#94a3b8" }}>{ex.why}</td>
                <td style={{ ...styles.td, textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>
                  {ex.tests}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} style={{ ...styles.td, borderBottom: "none", fontWeight: 600, color: "#64748b" }}>
                Total
              </td>
              <td style={{ ...styles.td, borderBottom: "none", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#4ade80" }}>
                {TOTAL_TESTS}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p style={styles.footnote}>
        Click any exercise name above to try it live. Each panel includes a context box explaining
        the problem, solution approach, and test coverage.
      </p>
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
    marginBottom: "24px",
    fontSize: "14px",
    lineHeight: 1.6,
  },
  philosophy: {
    padding: "16px 20px",
    background: "linear-gradient(135deg, #1e293b 0%, #1a2536 100%)",
    border: "1px solid #334155",
    borderRadius: "8px",
    marginBottom: "24px",
  },
  philHeading: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    marginBottom: "8px",
  },
  philText: {
    fontSize: "13px",
    color: "#cbd5e1",
    lineHeight: 1.7,
    margin: "0 0 8px 0",
  },
  tableWrap: {
    overflowX: "auto" as const,
  },
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
    padding: "12px",
    borderBottom: "1px solid rgba(51, 65, 85, 0.4)",
    color: "#cbd5e1",
    verticalAlign: "top" as const,
    lineHeight: 1.5,
  },
  exLink: {
    background: "none",
    border: "none",
    color: "#38bdf8",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
    padding: 0,
    textAlign: "left" as const,
    whiteSpace: "nowrap" as const,
  },
  langBadge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: 600,
    border: "1px solid",
    opacity: 0.9,
    whiteSpace: "nowrap" as const,
  },
  footnote: {
    marginTop: "16px",
    fontSize: "12px",
    color: "#475569",
    lineHeight: 1.5,
  },
};
