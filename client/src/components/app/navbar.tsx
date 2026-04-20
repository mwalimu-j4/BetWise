import { useMemo } from "react";
import {
  Bell,
  CircleDot,
  Clock3,
  Copy,
  Dumbbell,
  FileText,
  Flame,
  Goal,
  Grid2x2,
  Plus,
  Search,
  Shield,
  Swords,
  Star,
  Trophy,
  User,
  Volleyball,
} from "lucide-react";

import styles from "./navbar.module.css";

type OddsDirection = "up" | "down";

type TickerItem = {
  match: string;
  teams: string;
  odds: string;
  direction: OddsDirection;
};

type NavItem = {
  id: string;
  label: string;
  icon?: typeof Grid2x2;
  badge?: {
    text: string;
    tone: "red" | "gold" | "green";
  };
  isLive?: boolean;
};

type LeagueItem = {
  id: string;
  label: string;
  icon: typeof Grid2x2;
  color: string;
};

const tickerItems: TickerItem[] = [
  {
    match: "ENG Premier",
    teams: "Arsenal vs Liverpool",
    odds: "1.94",
    direction: "up",
  },
  {
    match: "La Liga",
    teams: "Real Madrid vs Sevilla",
    odds: "2.11",
    direction: "down",
  },
  {
    match: "Serie A",
    teams: "Inter vs Milan",
    odds: "1.78",
    direction: "up",
  },
  {
    match: "UCL",
    teams: "PSG vs Bayern",
    odds: "2.33",
    direction: "down",
  },
  {
    match: "NBA",
    teams: "Lakers vs Celtics",
    odds: "1.67",
    direction: "up",
  },
];

const navItems: NavItem[] = [
  { id: "home", label: "Home", icon: Grid2x2 },
  {
    id: "live",
    label: "Live",
    isLive: true,
    badge: { text: "24", tone: "red" },
  },
  { id: "upcoming", label: "Upcoming", icon: Clock3 },
  {
    id: "jackpot",
    label: "Jackpot",
    icon: Trophy,
    badge: { text: "4.2M", tone: "gold" },
  },
  {
    id: "promotions",
    label: "Promotions",
    icon: Star,
    badge: { text: "New", tone: "green" },
  },
  { id: "results", label: "Results", icon: FileText },
  { id: "casino", label: "Casino", icon: Flame },
  { id: "my-bets", label: "My Bets", icon: Copy },
];

const leagueItems: LeagueItem[] = [
  { id: "all-sports", label: "All Sports", icon: Goal, color: "#22c55e" },
  { id: "ucl", label: "UCL", icon: Trophy, color: "#facc15" },
  { id: "premier-league", label: "Premier League", icon: Goal, color: "#a855f7" },
  { id: "la-liga", label: "La Liga", icon: Goal, color: "#ef4444" },
  { id: "bundesliga", label: "Bundesliga", icon: Goal, color: "#dc2626" },
  { id: "serie-a", label: "Serie A", icon: Goal, color: "#2563eb" },
  { id: "ligue-1", label: "Ligue 1", icon: Goal, color: "#60a5fa" },
  { id: "nba", label: "NBA", icon: Volleyball, color: "#f97316" },
  { id: "tennis", label: "Tennis", icon: CircleDot, color: "#22c55e" },
  { id: "mma-ufc", label: "MMA/UFC", icon: Swords, color: "#f97316" },
  { id: "cricket", label: "Cricket", icon: Dumbbell, color: "#84cc16" },
  { id: "rugby", label: "Rugby", icon: Shield, color: "#38bdf8" },
  { id: "casino", label: "Casino", icon: Star, color: "#e879f9" },
  { id: "virtual", label: "Virtual", icon: Flame, color: "#38bdf8" },
];

export default function Navbar() {
  const tickerLoop = useMemo(() => [...tickerItems, ...tickerItems], []);

  return (
    <header className={styles.navbar}>
      <div className={styles.tickerBar}>
        <span className={styles.liveLabel}>LIVE</span>
        <div className={styles.tickerViewport}>
          <div className={styles.tickerTrack}>
            {tickerLoop.map((item, index) => (
              <div key={`${item.teams}-${index}`} className={styles.tickerItem}>
                <span>{item.match}</span>
                <span className={styles.tickerFixture}>{item.teams}</span>
                <span
                  className={
                    item.direction === "up"
                      ? styles.tickerOddsUp
                      : styles.tickerOddsDown
                  }
                >
                  {item.direction === "up" ? "▲" : "▼"} {item.odds}
                </span>
                <span className={styles.tickerDivider} aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <nav className={styles.mainNav} aria-label="Main navigation">
        <div className={styles.logoWrap}>
          <span className={styles.logoIcon} aria-hidden="true">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L15.1 8.9L22 12L15.1 15.1L12 22L8.9 15.1L2 12L8.9 8.9L12 2Z"
                fill="var(--color-text-dark)"
              />
            </svg>
          </span>
          <span className={styles.logoText}>
            <span className={styles.logoWhite}>BETT</span>
            <span className={styles.logoGold}>CENIC</span>
          </span>
        </div>

        <div className={styles.searchWrap}>
          <label className={styles.searchField} aria-label="Search matches">
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search matches, odds, teams..."
            />
            <Search size={16} color="var(--color-accent)" aria-hidden="true" />
          </label>
        </div>

        <div className={styles.linksScroller}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const badgeToneClass =
              item.badge?.tone === "red"
                ? styles.badgeRed
                : item.badge?.tone === "gold"
                  ? styles.badgeGold
                  : styles.badgeGreen;

            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.navItem} ${item.id === "home" ? styles.navItemActive : ""}`}
                aria-label={item.label}
              >
                {item.isLive ? (
                  <span className={styles.liveDot} aria-hidden="true" />
                ) : null}
                {Icon ? <Icon size={15} aria-hidden="true" /> : null}
                <span className={styles.navLabel}>{item.label}</span>
                {item.badge ? (
                  <span className={`${styles.badge} ${badgeToneClass}`}>
                    {item.badge.text}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className={styles.actions}>
          <div className={styles.balance}>
            <span className={styles.balanceLabel}>BALANCE</span>
            <span className={styles.balanceValue}>KES 0.00</span>
          </div>

          <div className={styles.notifyWrap}>
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Open notifications"
            >
              <Bell size={16} aria-hidden="true" />
            </button>
            <span className={styles.notifyDot} aria-hidden="true" />
          </div>

          <button
            type="button"
            className={styles.iconButton}
            aria-label="Open account menu"
          >
            <User size={16} aria-hidden="true" />
          </button>

          <button type="button" className={styles.depositButton}>
            <Plus size={16} aria-hidden="true" />
            <span className={styles.depositText}>Deposit</span>
          </button>
        </div>
      </nav>

      <div className={styles.leaguesStrip}>
        {leagueItems.map((league, index) => {
          const LeagueIcon = league.icon;

          return (
            <div key={league.id} className={styles.leagueEntry}>
              <button
                type="button"
                className={`${styles.leagueItem} ${index === 0 ? styles.leagueActive : ""}`}
              >
                <LeagueIcon
                  size={14}
                  className={styles.leagueIcon}
                  style={{ color: league.color }}
                  aria-hidden="true"
                />
                <span className={styles.leagueLabel}>{league.label}</span>
              </button>
              {index < leagueItems.length - 1 ? (
                <span className={styles.leagueDivider} aria-hidden="true" />
              ) : null}
            </div>
          );
        })}
      </div>
    </header>
  );
}
