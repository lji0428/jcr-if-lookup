import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = import.meta.env.VITE_JCR_API_URL || "https://jcr.jilai.dev";
const EIF_API = import.meta.env.VITE_EIF_API_URL || "https://predict-if.jilai.dev";

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
        padding: "24px 20px 60px",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "#111118",
            letterSpacing: -0.5,
            marginBottom: 4,
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
            marginBottom: 10,
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

      {/* ── Journal Browser ── */}
      <JournalBrowser />

      {/* ── Predict-IF Section ── */}
      <PredictIF />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div
        style={{
          textAlign: "center",
          marginTop: 32,
          paddingTop: 16,
          borderTop: "1px solid #e2e5ea",
          fontSize: 12,
          color: "#9ca3af",
        }}
      >
        Published IF from{" "}
        <a
          href="https://jcr.clarivate.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#6b7280" }}
        >
          Clarivate JCR
        </a>{" "}
        (2024) &middot; Estimated IF from{" "}
        <a
          href="https://www.webofscience.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#6b7280" }}
        >
          Web of Science
        </a>{" "}
        Citation Reports
      </div>
    </div>
  );
}

function JournalBrowser() {
  const [search, setSearch] = useState("");
  const [journals, setJournals] = useState(null);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    fetch("/journals.json")
      .then((r) => r.json())
      .then(setJournals)
      .catch(() => {});
  }, []);

  const hasSearch = search.trim().length > 0;

  const filtered =
    journals && hasSearch
      ? journals.filter((j) =>
          j.name.toLowerCase().includes(search.trim().toLowerCase())
        )
      : [];

  const sorted = [...filtered].sort((a, b) => b.if - a.if);
  const showPreview = !expanded && sorted.length > 5;
  const visibleData = showPreview ? sorted.slice(0, 5) : sorted;
  const totalPages = expanded ? Math.ceil(sorted.length / pageSize) : 1;
  const pageData = expanded
    ? sorted.slice(page * pageSize, (page + 1) * pageSize)
    : visibleData;

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

  if (!journals) return null;

  return (
    <div style={{ marginTop: 24 }}>
      {/* Divider */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 12,
        }}
      >
        <div style={{ flex: 1, height: 1, background: "#e2e5ea" }} />
        <span
          style={{
            fontSize: 11,
            color: "#9ca3af",
            letterSpacing: 1.5,
            fontWeight: 700,
          }}
        >
          BROWSE ALL JOURNALS
        </span>
        <div style={{ flex: 1, height: 1, background: "#e2e5ea" }} />
      </div>

      {/* Title + subtitle */}
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "#111118",
            letterSpacing: -0.3,
            marginBottom: 2,
          }}
        >
          Commonly Checked Journals
        </h2>
        <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
          Quick search across {journals.length.toLocaleString()} journals in
          Oncology, Cell Biology, Biochemistry &amp; Molecular Biology,
          Medicine (General &amp; Internal), Medicine (Research &amp;
          Experimental), CS &amp; AI, CS Interdisciplinary, Multidisciplinary
          Sciences, and Mathematical &amp; Computational Biology
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
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
            setExpanded(false);
          }}
          placeholder="Type to search (e.g. cancer, breast, AI, lancet)"
          style={{ ...inputStyle, flex: 1, border: "1px solid #e2e5ea" }}
        />
        {hasSearch && (
          <button
            onClick={() => {
              setSearch("");
              setPage(0);
              setExpanded(false);
            }}
            style={{
              ...inputStyle,
              cursor: "pointer",
              background: "#f3f4f6",
              border: "1px solid #d0d5dd",
              fontWeight: 700,
              letterSpacing: 1,
              padding: "12px 20px",
              color: "#6b7280",
              whiteSpace: "nowrap",
            }}
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Results only when searching */}
      {hasSearch && (
        <>
          {/* Count */}
          <div
            style={{
              fontSize: 12,
              color: "#9ca3af",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            {sorted.length.toLocaleString()} journal
            {sorted.length !== 1 ? "s" : ""} found for &ldquo;{search.trim()}
            &rdquo; &mdash; sorted by IF
          </div>

          {/* Results table */}
          {pageData.length > 0 && (
            <div
              style={{
                background: "#fff",
                border: "1px solid #e2e5ea",
                borderRadius: 10,
                overflow: "hidden",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              <div
                className="browse-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 54px 70px 40px",
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
                <span>RANK</span>
                <span>Q</span>
              </div>
              {pageData.map((j, i) => {
                const qc = Q_COLORS[j.q] || { color: "#6b7280" };
                return (
                  <div
                    key={`${j.name}-${j.cat}-${i}`}
                    className="browse-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 54px 70px 40px",
                      padding: "8px 16px",
                      borderBottom: "1px solid #f0f1f4",
                      fontSize: 13,
                      alignItems: "center",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f9fafb")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <span
                      style={{
                        fontWeight: 500,
                        color: "#111118",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {j.name}
                    </span>
                    <span style={{ fontWeight: 700, color: "#2563eb" }}>
                      {j.if}
                    </span>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>
                      {j.rank}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 12,
                        color: qc.color,
                      }}
                    >
                      {j.q}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Show all button when preview is truncated */}
          {showPreview && (
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <button
                onClick={() => {
                  setExpanded(true);
                  setPage(0);
                }}
                style={{
                  ...inputStyle,
                  fontSize: 13,
                  padding: "6px 16px",
                  cursor: "pointer",
                  background: "#f3f4f6",
                  border: "1px solid #d0d5dd",
                  color: "#4b5563",
                  fontWeight: 600,
                }}
              >
                Show all {sorted.length} results
              </button>
            </div>
          )}

          {sorted.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: "#d1d5db",
                fontSize: 14,
                padding: "20px 0",
              }}
            >
              No journals match &ldquo;{search.trim()}&rdquo;
            </div>
          )}

          {/* Pagination — only when expanded */}
          {expanded && totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                marginTop: 10,
                fontSize: 13,
                color: "#6b7280",
              }}
            >
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                style={{
                  ...inputStyle,
                  fontSize: 13,
                  padding: "6px 14px",
                  cursor: page > 0 ? "pointer" : "default",
                  opacity: page === 0 ? 0.4 : 1,
                }}
              >
                Prev
              </button>
              <span>
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                style={{
                  ...inputStyle,
                  fontSize: 13,
                  padding: "6px 14px",
                  cursor: page < totalPages - 1 ? "pointer" : "default",
                  opacity: page >= totalPages - 1 ? 0.4 : 1,
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PredictIF() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [history, setHistory] = useState([]);
  const [eifStats, setEifStats] = useState(null);

  const fetchEifStats = useCallback(async () => {
    try {
      const res = await fetch(`${EIF_API}/api/stats`);
      if (res.ok) setEifStats(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchEifStats();
  }, [fetchEifStats]);

  const calculate = async () => {
    const q = query.trim();
    if (!q || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setLogs([]);

    try {
      const res = await fetch(`${EIF_API}/api/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journal: q }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      fetchEifStats();
      const es = new EventSource(`${EIF_API}/api/stream/${data.job_id}`);
      es.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "log") {
          setLogs((prev) => [...prev, msg.message]);
        } else if (msg.type === "done") {
          es.close();
          setResult(msg.result);
          setHistory((prev) => {
            const filtered = prev.filter(
              (h) => h.journal !== msg.result.journal
            );
            return [msg.result, ...filtered].slice(0, 10);
          });
          setLoading(false);
        } else if (msg.type === "error") {
          es.close();
          setError(msg.error);
          setLoading(false);
        }
      };
      es.onerror = () => {
        es.close();
        // fallback polling
        const poll = setInterval(async () => {
          try {
            const r = await fetch(`${EIF_API}/api/status/${data.job_id}`);
            const d = await r.json();
            setLogs(d.logs || []);
            if (d.status === "done") {
              clearInterval(poll);
              setResult(d.result);
              setHistory((prev) => {
                const filtered = prev.filter(
                  (h) => h.journal !== d.result.journal
                );
                return [d.result, ...filtered].slice(0, 10);
              });
              setLoading(false);
            } else if (d.status === "error") {
              clearInterval(poll);
              setError(d.error);
              setLoading(false);
            }
          } catch {}
        }, 2000);
      };
    } catch (err) {
      setError(`Connection failed: ${err.message}`);
      setLoading(false);
    }
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
    <div style={{ marginTop: 24 }}>
      {/* Divider */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 12,
        }}
      >
        <div style={{ flex: 1, height: 1, background: "#e2e5ea" }} />
        <span
          style={{
            fontSize: 11,
            color: "#9ca3af",
            letterSpacing: 1.5,
            fontWeight: 700,
          }}
        >
          ESTIMATE UPCOMING IF
        </span>
        <div style={{ flex: 1, height: 1, background: "#e2e5ea" }} />
      </div>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "#111118",
            letterSpacing: -0.3,
            marginBottom: 4,
          }}
        >
          Predict-IF
        </h2>
        <p style={{ fontSize: 13, color: "#6b7280" }}>
          預測2025年impact factor (7月會公布). 僅供預測, 不負任何保證責任, 以JCR 最後公布為準
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
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") calculate();
          }}
          placeholder="Exact WOS journal name (e.g. Oncogene)"
          style={{ ...inputStyle, flex: 1, border: "1px solid #e2e5ea" }}
        />
        <button
          onClick={calculate}
          disabled={!query.trim() || loading}
          style={{
            ...inputStyle,
            cursor: query.trim() && !loading ? "pointer" : "default",
            background: query.trim() && !loading ? "#7c3aed" : "#e2e5ea",
            color: query.trim() && !loading ? "#fff" : "#9ca3af",
            border: "none",
            fontWeight: 700,
            letterSpacing: 1,
            padding: "12px 20px",
            transition: "all 0.15s",
            whiteSpace: "nowrap",
          }}
        >
          {loading ? "..." : "ESTIMATE"}
        </button>
      </div>

      {/* Usage counters */}
      {eifStats && (
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
            <b style={{ color: "#7c3aed", fontSize: 13 }}>
              {eifStats.today.toLocaleString()}
            </b>{" "}
            guest{eifStats.today !== 1 ? "s" : ""} used this IF predictor today
          </span>
          <span className="stats-divider" style={{ color: "#d1d5db" }}>
            |
          </span>
          <span>
            Since running,{" "}
            <b style={{ color: "#7c3aed", fontSize: 13 }}>
              {eifStats.total.toLocaleString()}
            </b>{" "}
            guest{eifStats.total !== 1 ? "s" : ""} have used this IF predictor
          </span>
        </div>
      )}

      {/* Progress */}
      {loading && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e5ea",
            borderRadius: 10,
            padding: "48px 20px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          <div className="eif-spinner" style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 15, color: "#6b7280" }}>Calculating...</div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>
            This may take 30-60 seconds
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

      {/* Result */}
      {result && !loading && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e5ea",
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
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
              {result.journal}
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
              Estimated from WOS (2023-2024 publications, 2025 citations)
            </div>
          </div>
          <div
            className="metrics-grid eif-metrics"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              borderBottom: "1px solid #f0f1f4",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderRight: "1px solid #f0f1f4",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  letterSpacing: 1.5,
                }}
              >
                ESTIMATED IF
              </div>
              <div
                style={{
                  fontSize: 42,
                  fontWeight: 800,
                  color: "#7c3aed",
                  marginTop: 4,
                }}
              >
                {result.eif.toFixed(2)}
              </div>
            </div>
            <div
              style={{
                padding: "20px 24px",
                borderRight: "1px solid #f0f1f4",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  letterSpacing: 1.5,
                }}
              >
                PUBLICATIONS
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: "#2563eb",
                  marginTop: 4,
                }}
              >
                {result.pub_count.toLocaleString()}
              </div>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  letterSpacing: 1.5,
                }}
              >
                CITATIONS 2025
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: "#0891b2",
                  marginTop: 4,
                }}
              >
                {result.citations_2025.toLocaleString()}
              </div>
            </div>
          </div>
          <div
            style={{
              padding: "12px 20px",
              fontFamily:
                '"SF Mono", "Fira Code", Consolas, monospace',
              fontSize: 13,
              color: "#6b7280",
              background: "#f9fafb",
              textAlign: "center",
            }}
          >
            {result.citations_2025.toLocaleString()} &divide;{" "}
            {result.pub_count.toLocaleString()} = {result.eif.toFixed(2)}
          </div>
        </div>
      )}

      {/* eIF History */}
      {history.length > 0 && !loading && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: "#9ca3af",
              letterSpacing: 1.5,
              marginBottom: 10,
            }}
          >
            RECENT ESTIMATES
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
            <div
              className="eif-history-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 70px 90px 60px",
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
              <span>eIF</span>
              <span>CITATIONS</span>
              <span>PUBS</span>
            </div>
            {history.map((h, i) => (
              <div
                key={i}
                onClick={() => {
                  setResult(h);
                  setQuery(h.journal);
                }}
                className="eif-history-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 70px 90px 60px",
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
                <span style={{ fontWeight: 700, color: "#7c3aed" }}>
                  {h.eif.toFixed(2)}
                </span>
                <span style={{ color: "#6b7280" }}>
                  {h.citations_2025.toLocaleString()}
                </span>
                <span style={{ color: "#6b7280" }}>
                  {h.pub_count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
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
