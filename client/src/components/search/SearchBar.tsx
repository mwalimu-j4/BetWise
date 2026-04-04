import { Link, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type SearchResult = {
  id: string;
  name: string;
  league: string;
  odds: string;
  to:
    | "/user"
    | "/user/payments"
    | "/user/payments/deposit"
    | "/user/payments/history";
};

const searchData: SearchResult[] = [
  {
    id: "M-1044",
    name: "Arsenal vs Liverpool",
    league: "Premier League",
    odds: "1.85",
    to: "/user/payments/deposit",
  },
  {
    id: "M-1218",
    name: "Real Madrid vs Girona",
    league: "La Liga",
    odds: "1.91",
    to: "/user/payments",
  },
  {
    id: "M-1407",
    name: "Inter vs Napoli",
    league: "Serie A",
    odds: "2.14",
    to: "/user/payments/history",
  },
  {
    id: "M-1550",
    name: "PSG vs Monaco",
    league: "Ligue 1",
    odds: "1.76",
    to: "/user",
  },
];

export default function SearchBar() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return searchData;

    return searchData.filter((item) => {
      return (
        item.name.toLowerCase().includes(value) ||
        item.league.toLowerCase().includes(value) ||
        item.id.toLowerCase().includes(value)
      );
    });
  }, [query]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const timer = window.setTimeout(() => setLoading(false), 220);
    return () => window.clearTimeout(timer);
  }, [query, open]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) setOpen(true);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => {
        if (filtered.length === 0) return -1;
        return prev >= filtered.length - 1 ? 0 : prev + 1;
      });
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => {
        if (filtered.length === 0) return -1;
        return prev <= 0 ? filtered.length - 1 : prev - 1;
      });
    }

    if (event.key === "Enter" && activeIndex >= 0 && filtered[activeIndex]) {
      event.preventDefault();
      const target = filtered[activeIndex];
      navigate({ to: target.to });
      setOpen(false);
      setQuery("");
      setActiveIndex(-1);
    }

    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="bc-search" ref={rootRef}>
      <label className="bc-search-field" aria-label="Search matches">
        <input
          className="bc-search-input"
          type="text"
          placeholder="Search matches, teams or leagues"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        <Search size={14} className="bc-search-icon" aria-hidden="true" />
      </label>

      {open ? (
        <div className="bc-search-dropdown" role="listbox">
          {loading ? (
            <div className="bc-search-skeleton-list" aria-hidden="true">
              <div className="bc-search-skeleton" />
              <div className="bc-search-skeleton" />
              <div className="bc-search-skeleton" />
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((item, index) => (
              <Link
                key={item.id}
                to={item.to}
                className={`bc-search-row ${activeIndex === index ? "is-active" : ""}`}
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                  setActiveIndex(-1);
                }}
              >
                <span className="bc-search-match-icon" aria-hidden="true">
                  o
                </span>
                <div className="bc-search-meta">
                  <span className="bc-search-name">{item.name}</span>
                  <span className="bc-search-league">{item.league}</span>
                </div>
                <span className="bc-search-odds">{item.odds}</span>
              </Link>
            ))
          ) : (
            <div className="bc-search-empty">
              <div className="bc-search-empty-icon" aria-hidden="true">
                ?
              </div>
              <p className="bc-search-empty-title">
                No matches found for "{query.trim()}"
              </p>
              <p className="bc-search-empty-copy">
                Try searching by team name, league or match ID
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
