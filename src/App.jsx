import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = import.meta.env.VITE_JCR_API_URL || "https://jcr.jilai.dev";

const Q_COLORS = {
  Q1: { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  Q2: { color: "#ca8a04", bg: "#fefce8", border: "#fef08a" },
  Q3: { color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
  Q4: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
};

export default function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const inputRef = useRef(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (res.ok) setStats(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchStats();
    inputRef.current?.focus();
  }, [fetchStats]);

  const search = async () => {
    const q = query.trim();
    if (!q || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        `${API_BASE}/jcr?journal=${encodeURIComponent(q)}`
      );
      const data = await res.json();

      if (data.error) {
        setError(
          data.error === "not found" ? `"${q}" not found in JCR` : data.error
        );
      } else {
        setResult(data);
        setHistory((prev) => {
          const filtered = prev.filter((h) => h.journal !== data.journal);
          return [data, ...filtered].slice(0, 10);
        });
      }
      fetchStats();
    } catch (err) {
      setError(`Connection failed: ${err.message}`);
    }
    setLoading(false);
  };

  const inputStyle = {
    fontFamily: "inherit",
    fontSize: 15,
    padding: "12px 16px",
    border: "1px solid #d0d5dd",
    borderRadius: 8,
    outline: "none",
    background: "#ffffff",
    color: "#111118",
  };

  return (
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "40px 20px 60px",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#111118",
            letterSpacing: -0.5,
            marginBottom: 6,
          }}
        >
          JCR Impact Factor Lookup
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280" }}>
          Search journal Impact Factors, JCI scores, and quartile rankings
        </p>
      </div>

      {/* Search bar */}
      <div
        className="search-row"
        style={{
          background: "#fff",
          border: "1px solid #e2e5ea",
          borderRadius: 10,
          padding: "12px 14px",
          marginBottom: 12,
          display: "flex",
          gap: 10,
          alignItems: "center",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") search();
          }}
          placeholder="Journal name (e.g. Oncogene, Nature Medicine)"
          style={{ ...inputStyle, flex: 1, border: "1px solid #e2e5ea" }}
        />
        <button
          onClick={search}
          disabled={!query.trim() || loading}
          style={{
            ...inputStyle,
            cursor: query.trim() && !loading ? "pointer" : "default",
            background: query.trim() && !loading ? "#2563eb" : "#e2e5ea",
            color: query.trim() && !loading ? "#fff" : "#9ca3af",
            border: "none",
            fontWeight: 700,
            letterSpacing: 1,
            padding: "12px 20px",
            transition: "all 0.15s",
            whiteSpace: "nowrap",
          }}
        >
          {loading ? "..." : "LOOKUP"}
        </button>
      </div>

      {/* Usage counters */}
      {stats && (
        <div
          className="stats-row"
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 20,
            flexWrap: "wrap",
            fontSize: 12,
            color: "#9ca3af",
            justifyContent: "center",
          }}
        >
          <span>
            <b style={{ color: "#2563eb", fontSize: 13 }}>
              {stats.today.toLocaleString()}
            </b>{" "}
            guest{stats.today !== 1 ? "s" : ""} used this IF tracker today
          </span>
          <span className="stats-divider" style={{ color: "#d1d5db" }}>
            |
          </span>
          <span>
            Since running,{" "}
            <b style={{ color: "#7c3aed", fontSize: 13 }}>
              {stats.total.toLocaleString()}
            </b>{" "}
            guest{stats.total !== 1 ? "s" : ""} have used this IF tracker
          </span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e5ea",
            borderRadius: 10,
            padding: "48px",
            textAlign: "center",
            color: "#6b7280",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontSize: 15 }}>Querying JCR...</div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>
            First lookups may take 10-15 seconds
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 10,
            padding: "16px 20px",
            color: "#dc2626",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {/* Result card */}
      {result && !loading && <ResultCard data={result} />}

      {/* Publisher warning */}
      {result && !loading && (() => {
        const p = (result.publisher || "").toLowerCase();
        const j = (result.journal || "").toLowerCase();
        const isMDPI = p.includes("mdpi") || p.includes("multidisciplinary digital publishing");
        const isFrontiers = p.includes("frontiers") || j.startsWith("frontiers in ");
        if (!isMDPI && !isFrontiers) return null;
        const label = isMDPI ? "MDPI" : "Frontiers";
        return (
          <div style={{
            background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10,
            padding: "12px 16px", marginTop: 10, fontSize: 13, color: "#92400e",
          }}>
            Note: the journal you are checking is <b>{label}</b>.
          </div>
        );
      })()}

      {/* History */}
      {history.length > 0 && !loading && (
        <div style={{ marginTop: 24 }}>
          <div
            style={{
              fontSize: 11,
              color: "#9ca3af",
              letterSpacing: 1.5,
              marginBottom: 10,
            }}
          >
            RECENT LOOKUPS
          </div>
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e5ea",
              borderRadius: 10,
              overflow: "hidden",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            {/* Header */}
            <div
              className="history-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 80px 60px",
                padding: "10px 16px",
                background: "#f9fafb",
                borderBottom: "1px solid #e2e5ea",
                fontSize: 11,
                color: "#9ca3af",
                letterSpacing: 1.5,
                fontWeight: 700,
              }}
            >
              <span>JOURNAL</span>
              <span>IF</span>
              <span>BEST Q</span>
            </div>
            {history.map((h, i) => {
              const bestQ =
                h.categories?.reduce((best, c) => {
                  const qn = parseInt(c.quartile?.replace("Q", "") || "5");
                  const bn = parseInt(best?.replace("Q", "") || "5");
                  return qn < bn ? c.quartile : best;
                }, null) || "\u2014";
              const qc = Q_COLORS[bestQ] || { color: "#6b7280" };

              return (
                <div
                  key={i}
                  onClick={() => {
                    setResult(h);
                    setQuery(h.journal);
                  }}
                  className="history-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 80px 60px",
                    padding: "10px 16px",
                    borderBottom: "1px solid #f0f1f4",
                    cursor: "pointer",
                    fontSize: 13,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f9fafb")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <span style={{ fontWeight: 500, color: "#111118" }}>
                    {h.journal}
                  </span>
                  <span style={{ fontWeight: 700, color: "#2563eb" }}>
                    {h.impact_factor ?? "\u2014"}
                  </span>
                  <span
                    style={{ fontWeight: 700, fontSize: 12, color: qc.color }}
                  >
                    {bestQ}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div
        style={{
          textAlign: "center",
          marginTop: 48,
          paddingTop: 20,
          borderTop: "1px solid #e2e5ea",
          fontSize: 12,
          color: "#9ca3af",
        }}
      >
        Data from{" "}
        <a
          href="https://jcr.clarivate.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#6b7280" }}
        >
          Clarivate JCR
        </a>{" "}
        (2024)
      </div>
    </div>
  );
}

function ResultCard({ data }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e5ea",
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      {/* Journal header */}
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid #f0f1f4",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#111118",
            lineHeight: 1.3,
          }}
        >
          {data.journal}
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
          JCR {data.year}
          {data._cached && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 11,
                color: "#6b7280",
                background: "#f3f4f6",
                padding: "1px 6px",
                borderRadius: 3,
              }}
            >
              cached
            </span>
          )}
        </div>
      </div>

      {/* Metrics row */}
      <div
        className="metrics-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          borderBottom: "1px solid #f0f1f4",
        }}
      >
        <div
          style={{ padding: "20px 24px", borderRight: "1px solid #f0f1f4" }}
        >
          <div style={{ fontSize: 11, color: "#9ca3af", letterSpacing: 1.5 }}>
            IMPACT FACTOR
          </div>
          <div
            style={{
              fontSize: 42,
              fontWeight: 800,
              color: "#2563eb",
              marginTop: 4,
            }}
          >
            {data.impact_factor ?? "\u2014"}
          </div>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 11, color: "#9ca3af", letterSpacing: 1.5 }}>
            JCI
          </div>
          <div
            style={{
              fontSize: 42,
              fontWeight: 800,
              color: "#7c3aed",
              marginTop: 4,
            }}
          >
            {data.jci ?? "\u2014"}
          </div>
        </div>
      </div>

      {/* Categories table */}
      {data.categories && data.categories.length > 0 && (
        <div>
          <div
            className="cat-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 100px 60px",
              padding: "10px 20px",
              background: "#f9fafb",
              borderBottom: "1px solid #e2e5ea",
              fontSize: 11,
              color: "#9ca3af",
              letterSpacing: 1.5,
              fontWeight: 700,
            }}
          >
            <span>CATEGORY</span>
            <span>RANK</span>
            <span>QUARTILE</span>
          </div>
          {data.categories.map((cat, i) => {
            const qc = Q_COLORS[cat.quartile] || {
              color: "#6b7280",
              bg: "#f9fafb",
              border: "#e2e5ea",
            };
            return (
              <div
                key={i}
                className="cat-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 100px 60px",
                  padding: "10px 20px",
                  borderBottom: "1px solid #f0f1f4",
                  fontSize: 13,
                  alignItems: "center",
                }}
              >
                <span style={{ color: "#4b5563" }}>{cat.name}</span>
                <span style={{ color: "#6b7280", fontSize: 12 }}>
                  {cat.rank}
                </span>
                <span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: qc.color,
                      background: qc.bg,
                      border: `1px solid ${qc.border}`,
                      padding: "2px 8px",
                      borderRadius: 4,
                    }}
                  >
                    {cat.quartile}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
