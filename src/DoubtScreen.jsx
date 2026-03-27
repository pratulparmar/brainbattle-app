import { useState, useEffect, useRef } from "react";

// ─── Connect to your live Railway RAG backend ─────────────────────────────────
const RAG_URL = "https://brainbattle-rag-production.up.railway.app";

// ─── Dr. Neuron SVG Character ─────────────────────────────────────────────────
function DrNeuron({ mood = "idle" }) {
  const eyes = {
    idle:     { l: "M8,10 Q10,8 12,10", r: "M18,10 Q20,8 22,10", mouth: "M11,16 Q15,19 19,16" },
    thinking: { l: "M8,9 Q10,12 12,9",  r: "M18,9 Q20,9 22,9",  mouth: "M12,16 Q15,15 18,16" },
    happy:    { l: "M8,10 Q10,7 12,10",  r: "M18,10 Q20,7 22,10", mouth: "M10,15 Q15,20 20,15" },
    confused: { l: "M8,10 Q10,13 12,10", r: "M18,8 Q20,11 22,8",  mouth: "M11,17 Q15,15 19,17" },
  };
  const e = eyes[mood] || eyes.idle;

  return (
    <svg width="90" height="90" viewBox="0 0 40 40" fill="none">
      {/* Body blob */}
      <ellipse cx="20" cy="22" rx="14" ry="13" fill="#FFF0C2" stroke="#FFD166" strokeWidth="1.5"/>
      {/* Brain bumps */}
      <path d="M10,16 Q8,10 12,9 Q13,6 17,7 Q19,4 21,7 Q25,5 27,9 Q31,10 30,16" fill="#FFD166" stroke="#FFB347" strokeWidth="1"/>
      {/* Eyes */}
      <path d={e.l} stroke="#5C4033" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path d={e.r} stroke="#5C4033" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      {/* Mouth */}
      <path d={e.mouth} stroke="#5C4033" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      {/* Cheeks */}
      <ellipse cx="10" cy="17" rx="2.5" ry="1.5" fill="#FFB3C1" opacity="0.6"/>
      <ellipse cx="30" cy="17" rx="2.5" ry="1.5" fill="#FFB3C1" opacity="0.6"/>
      {/* Small stars */}
      <text x="33" y="8" fontSize="5">✦</text>
      <text x="2" y="10" fontSize="4">✦</text>
    </svg>
  );
}

// ─── NCERT Source Badge ────────────────────────────────────────────────────────
function SourceBadge({ source }) {
  if (!source) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: "#E8F5E9", color: "#2E7D32",
      fontSize: 10, fontWeight: 700, padding: "3px 8px",
      borderRadius: 20, letterSpacing: 0.3,
    }}>
      📗 {source}
    </span>
  );
}

// ─── History Toggle ────────────────────────────────────────────────────────────
function SegmentedToggle({ value, onChange }) {
  return (
    <div style={{
      display: "flex", background: "#EDE9FE", borderRadius: 20,
      padding: 3, gap: 2, width: "fit-content", margin: "0 auto",
    }}>
      {["Recent", "All"].map(tab => (
        <button key={tab} onClick={() => onChange(tab)}
          style={{
            padding: "6px 20px", borderRadius: 18, border: "none",
            fontFamily: "Nunito, sans-serif", fontSize: 12, fontWeight: 700,
            cursor: "pointer", transition: "all .2s",
            background: value === tab ? "#fff" : "transparent",
            color: value === tab ? "#7C3AED" : "#9CA3AF",
            boxShadow: value === tab ? "0 2px 8px rgba(124,58,237,.15)" : "none",
          }}>
          {tab}
        </button>
      ))}
    </div>
  );
}

// ─── Main DoubtScreen ──────────────────────────────────────────────────────────
export default function DoubtScreen({ onBack, userName = "Student" }) {
  const [question, setQuestion]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [answer, setAnswer]       = useState(null);
  const [sources, setSources]     = useState([]);
  const [mood, setMood]           = useState("idle");
  const [history, setHistory]     = useState([]);
  const [historyTab, setHistoryTab] = useState("Recent");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [subject, setSubject]     = useState("Biology");
  const inputRef = useRef(null);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("bb_doubt_history");
    if (saved) try { setHistory(JSON.parse(saved)); } catch(e) {}
  }, []);

  const saveHistory = (q, a) => {
    const item = { q, a: a.slice(0, 120), time: Date.now(), subject };
    const updated = [item, ...history].slice(0, 20);
    setHistory(updated);
    localStorage.setItem("bb_doubt_history", JSON.stringify(updated));
  };

  const askDoubt = async () => {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setAnswer(null);
    setSources([]);
    setMood("thinking");

    try {
      const res = await fetch(`${RAG_URL}/doubt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, subject, history: [] }),
      });
      const data = await res.json();
      setAnswer(data.answer);
      setSources(data.sources || []);
      setMood("happy");
      saveHistory(q, data.answer);
    } catch(e) {
      setAnswer("⚠️ Could not reach the server. Please check your connection.");
      setMood("confused");
    }
    setLoading(false);
  };

  const displayHistory = historyTab === "Recent"
    ? history.slice(0, 5)
    : history;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #F5F0FF 0%, #FFF8F0 50%, #F0FFF4 100%)",
      fontFamily: "'Nunito', 'Segoe UI', sans-serif",
      paddingBottom: 40,
    }}>
      {/* Import Nunito font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes floatBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes fadeSlide { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        background: "rgba(255,255,255,0.7)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(124,58,237,.08)",
        padding: "44px 20px 0", marginBottom: 8,
      }}>
        <button onClick={onBack} style={{
          background: "rgba(124,58,237,.1)", border: "none",
          borderRadius: 12, width: 36, height: 36,
          color: "#7C3AED", fontSize: 16, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 16,
        }}>←</button>

        {/* Hero section */}
        <div style={{
          display: "flex", alignItems: "center",
          gap: 16, paddingBottom: 20,
        }}>
          <div style={{ animation: "floatBob 3s ease infinite", flexShrink: 0 }}>
            <DrNeuron mood={mood} />
          </div>
          <div>
            <div style={{
              fontSize: 11, fontWeight: 800, color: "#9CA3AF",
              letterSpacing: 2, textTransform: "uppercase", marginBottom: 2,
            }}>
              Dr. Neuron 🧠
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#1F1235", lineHeight: 1.2 }}>
              Hello, {userName}! 👋
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2, fontWeight: 600 }}>
              Stuck on something? Let's clear it.
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>

        {/* ── Subject Pills ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, marginTop: 12 }}>
          {["Biology", "Chemistry", "Physics"].map(s => (
            <button key={s} onClick={() => setSubject(s)} style={{
              padding: "6px 14px", borderRadius: 20, border: "1.5px solid",
              borderColor: subject === s ? "#7C3AED" : "#E5E7EB",
              background: subject === s ? "#EDE9FE" : "#fff",
              color: subject === s ? "#7C3AED" : "#9CA3AF",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              transition: "all .2s",
            }}>{s}</button>
          ))}
        </div>

        {/* ── Question Input Card ── */}
        <div style={{
          background: "#fff",
          borderRadius: 24,
          padding: 20,
          marginBottom: 16,
          boxShadow: "0 4px 0 #E9D5FF, 0 8px 32px rgba(124,58,237,.08)",
          border: "1.5px solid #EDE9FE",
          animation: "fadeSlide .4s ease both",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: loading ? "#FEF3C7" : question.length > 0 ? "#DBEAFE" : "#FEF9EC",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, transition: "all .3s",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,.06)",
            }}>
              {loading ? "🤔" : question.length > 10 ? "🧐" : "💬"}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#1F1235" }}>
                Type your doubt
              </div>
              <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>
                NCERT-grounded · Instant answer
              </div>
            </div>
          </div>

          <textarea
            ref={inputRef}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askDoubt(); }}}
            placeholder="e.g. Why does meiosis have two divisions? What is the role of RuBisCO?"
            rows={3}
            style={{
              width: "100%", border: "1.5px solid #EDE9FE",
              borderRadius: 16, padding: "12px 14px",
              fontSize: 14, color: "#1F1235", lineHeight: 1.6,
              background: "#FAFAFA", outline: "none",
              fontFamily: "Nunito, sans-serif", resize: "none",
              boxSizing: "border-box",
            }}
          />

          <button onClick={askDoubt} disabled={loading || !question.trim()} style={{
            width: "100%", marginTop: 12, padding: "14px",
            background: loading || !question.trim()
              ? "#E5E7EB"
              : "linear-gradient(135deg, #7C3AED, #EC4899)",
            border: "none", borderRadius: 16,
            color: loading || !question.trim() ? "#9CA3AF" : "#fff",
            fontSize: 14, fontWeight: 800, cursor: loading || !question.trim() ? "not-allowed" : "pointer",
            transition: "all .2s",
            boxShadow: loading || !question.trim() ? "none" : "0 4px 16px rgba(124,58,237,.35)",
            letterSpacing: 0.3,
          }}>
            {loading ? (
              <span style={{ animation: "pulse 1s infinite" }}>
                🔍 Dr. Neuron is thinking...
              </span>
            ) : "Ask Dr. Neuron ✨"}
          </button>
        </div>

        {/* ── Answer Card ── */}
        {answer && (
          <div style={{
            background: "#fff", borderRadius: 24, padding: 20, marginBottom: 16,
            boxShadow: "0 4px 0 #D1FAE5, 0 8px 32px rgba(16,185,129,.08)",
            border: "1.5px solid #D1FAE5",
            animation: "fadeSlide .5s ease both",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: "#D1FAE5", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 16,
                }}>💡</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#065F46" }}>Dr. Neuron's Answer</div>
                  <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 600 }}>NCERT-grounded response</div>
                </div>
              </div>
            </div>

            {/* Sources */}
            {sources.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {sources.slice(0, 3).map((s, i) => (
                  <SourceBadge key={i} source={s.source || s.chapter} />
                ))}
              </div>
            )}

            {/* Answer text */}
            <div style={{
              fontSize: 14, color: "#1F2937", lineHeight: 1.8,
              fontWeight: 600, whiteSpace: "pre-wrap",
            }}>
              {answer}
            </div>

            {/* Ask followup */}
            <button onClick={() => {
              setAnswer(null); setSources([]); setMood("idle");
              setQuestion(""); inputRef.current?.focus();
            }} style={{
              marginTop: 14, padding: "8px 16px",
              background: "#F0FDF4", border: "1.5px solid #D1FAE5",
              borderRadius: 12, color: "#059669",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>
              + Ask a follow-up
            </button>
          </div>
        )}

        {/* ── Doubt History ── */}
        {history.length > 0 && (
          <div style={{
            background: "#fff", borderRadius: 24, padding: 20,
            boxShadow: "0 4px 0 #EDE9FE, 0 8px 32px rgba(124,58,237,.06)",
            border: "1.5px solid #EDE9FE",
            animation: "fadeSlide .6s .1s ease both",
          }}>
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between", marginBottom: 16,
            }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#1F1235" }}>
                📚 Previous Doubts
              </div>
              <SegmentedToggle value={historyTab} onChange={setHistoryTab} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {displayHistory.map((item, i) => {
                const colors = [
                  { bg: "#FEF3C7", border: "#FCD34D", dot: "#F59E0B" },
                  { bg: "#DBEAFE", border: "#93C5FD", dot: "#3B82F6" },
                  { bg: "#FCE7F3", border: "#F9A8D4", dot: "#EC4899" },
                  { bg: "#D1FAE5", border: "#6EE7B7", dot: "#10B981" },
                  { bg: "#EDE9FE", border: "#C4B5FD", dot: "#7C3AED" },
                ];
                const c = colors[i % colors.length];
                return (
                  <button key={i} onClick={() => {
                    setQuestion(item.q);
                    setAnswer(item.a);
                    setMood("happy");
                  }} style={{
                    background: c.bg, border: `1.5px solid ${c.border}`,
                    borderRadius: 14, padding: "10px 14px",
                    textAlign: "left", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 10,
                    transition: "transform .15s",
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: c.dot, flexShrink: 0,
                    }}/>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#1F2937", lineHeight: 1.3 }}>
                        {item.q.slice(0, 55)}{item.q.length > 55 ? "..." : ""}
                      </div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2, fontWeight: 600 }}>
                        {item.subject} · {new Date(item.time).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {history.length > 0 && (
              <button onClick={() => {
                setHistory([]);
                localStorage.removeItem("bb_doubt_history");
              }} style={{
                marginTop: 12, background: "transparent", border: "none",
                color: "#EF4444", fontSize: 11, fontWeight: 700,
                cursor: "pointer", padding: "4px 0",
              }}>
                🗑 Clear history
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
