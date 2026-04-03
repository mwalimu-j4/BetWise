import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  CreditCard,
  DollarSign,
  Flag,
  LayoutDashboard,
  Settings,
  Shield,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

export type AdminTone =
  | "accent"
  | "blue"
  | "gold"
  | "red"
  | "purple"
  | "muted"
  | "live";

export type AdminNavId =
  | "dashboard"
  | "users"
  | "bets"
  | "events"
  | "odds"
  | "transactions"
  | "risk"
  | "reports"
  | "settings";

export type AdminBadgeStatus =
  | "pending"
  | "won"
  | "lost"
  | "flagged"
  | "completed"
  | "active"
  | "suspended"
  | "live"
  | "upcoming"
  | "verified"
  | "failed"
  | "high"
  | "medium"
  | "low";

export interface AdminNavSection {
  id: AdminNavId;
  label: string;
  icon: LucideIcon;
}

export interface AdminMetric {
  label: string;
  value: string;
  change: string;
  up: boolean;
  icon: LucideIcon;
  tone: AdminTone;
}

export interface AdminSummaryStat {
  label: string;
  value: string;
  tone: AdminTone;
}

export interface AdminRecentBet {
  id: string;
  user: string;
  sport: string;
  event: string;
  market: string;
  odds: string;
  stake: string;
  status: Extract<AdminBadgeStatus, "pending" | "won" | "lost" | "flagged">;
  time: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  balance: string;
  totalBets: number;
  won: number;
  kyc: Extract<AdminBadgeStatus, "verified" | "pending" | "failed">;
  status: Extract<AdminBadgeStatus, "active" | "suspended">;
  risk: Extract<AdminBadgeStatus, "low" | "medium" | "high">;
  joined: string;
}

export interface AdminEvent {
  id: string;
  sport: string;
  league: string;
  home: string;
  away: string;
  date: string;
  status: Extract<AdminBadgeStatus, "live" | "upcoming">;
  markets: number;
  totalBets: number;
  exposure: string;
}

export interface AdminTransaction {
  id: string;
  user: string;
  type: "deposit" | "withdrawal";
  method: string;
  amount: string;
  status: Extract<AdminBadgeStatus, "completed" | "pending" | "flagged">;
  time: string;
}

export interface AdminRiskAlert {
  id: number;
  type: Extract<AdminBadgeStatus, "high" | "medium" | "low">;
  user: string;
  message: string;
  time: string;
}

export interface AdminOddsRow {
  event: string;
  market: string;
  selectionOne: string;
  oddsOne: string;
  selectionTwo: string;
  oddsTwo: string;
  selectionThree: string;
  oddsThree: string;
  margin: string;
  status: Extract<AdminBadgeStatus, "active" | "suspended">;
}

export interface AdminChartBar {
  day: string;
  revenue: number;
  bets: number;
}

export interface AdminSportShare {
  sport: string;
  percentage: number;
  tone: AdminTone;
}

export interface AdminReport {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: AdminTone;
  lastGenerated: string;
}

export interface AdminSettingSection {
  title: string;
  items: string[];
}

export interface AdminExposureLimit {
  event: string;
  used: number;
  limit: number;
  tone: AdminTone;
}

export interface AdminRiskControl {
  label: string;
  value: string;
}

export const navSections: AdminNavSection[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "User Management", icon: Users },
  { id: "bets", label: "Bet Management", icon: Target },
  { id: "events", label: "Events & Sports", icon: Trophy },
  { id: "odds", label: "Odds Control", icon: SlidersHorizontal },
  { id: "transactions", label: "Transactions", icon: CreditCard },
  { id: "risk", label: "Risk Management", icon: Shield },
  { id: "reports", label: "Reports & Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

export const dashboardKpis: AdminMetric[] = [
  {
    label: "Total Revenue",
    value: "$2,847,392",
    change: "+12.4%",
    up: true,
    icon: DollarSign,
    tone: "accent",
  },
  {
    label: "Active Users",
    value: "48,291",
    change: "+8.7%",
    up: true,
    icon: Users,
    tone: "blue",
  },
  {
    label: "Open Bets",
    value: "12,847",
    change: "+3.2%",
    up: true,
    icon: Target,
    tone: "gold",
  },
  {
    label: "House Edge",
    value: "4.82%",
    change: "-0.3%",
    up: false,
    icon: TrendingUp,
    tone: "purple",
  },
  {
    label: "GGR Today",
    value: "$184,230",
    change: "+22.1%",
    up: true,
    icon: Zap,
    tone: "accent",
  },
  {
    label: "Flagged Bets",
    value: "23",
    change: "+5",
    up: false,
    icon: AlertTriangle,
    tone: "red",
  },
];

export const recentBets: AdminRecentBet[] = [
  {
    id: "#BT-9812",
    user: "alex_m",
    sport: "Football",
    event: "Man City vs Arsenal",
    market: "Match Winner",
    odds: "2.40",
    stake: "$500",
    status: "pending",
    time: "2m ago",
  },
  {
    id: "#BT-9811",
    user: "sarah_k",
    sport: "Tennis",
    event: "Djokovic vs Alcaraz",
    market: "Total Sets",
    odds: "1.85",
    stake: "$250",
    status: "won",
    time: "5m ago",
  },
  {
    id: "#BT-9810",
    user: "mike_t",
    sport: "Basketball",
    event: "Lakers vs Warriors",
    market: "Spread -3.5",
    odds: "1.91",
    stake: "$1,200",
    status: "lost",
    time: "8m ago",
  },
  {
    id: "#BT-9809",
    user: "priya_v",
    sport: "Football",
    event: "Real Madrid vs Barca",
    market: "Both Score",
    odds: "1.72",
    stake: "$300",
    status: "won",
    time: "12m ago",
  },
  {
    id: "#BT-9808",
    user: "chen_w",
    sport: "UFC",
    event: "Jones vs Miocic",
    market: "Method of Victory",
    odds: "3.50",
    stake: "$800",
    status: "flagged",
    time: "15m ago",
  },
  {
    id: "#BT-9807",
    user: "omar_a",
    sport: "Cricket",
    event: "IND vs AUS",
    market: "Top Batsman",
    odds: "5.00",
    stake: "$100",
    status: "pending",
    time: "18m ago",
  },
];

export const platformUsers: AdminUser[] = [
  {
    id: "USR-001",
    name: "Alexander Mitchell",
    email: "alex_m@email.com",
    balance: "$4,200",
    totalBets: 342,
    won: 156,
    kyc: "verified",
    status: "active",
    risk: "low",
    joined: "Jan 2023",
  },
  {
    id: "USR-002",
    name: "Sarah Kowalski",
    email: "sarah_k@email.com",
    balance: "$12,800",
    totalBets: 891,
    won: 401,
    kyc: "verified",
    status: "active",
    risk: "medium",
    joined: "Mar 2022",
  },
  {
    id: "USR-003",
    name: "Mike Torres",
    email: "mike_t@email.com",
    balance: "$320",
    totalBets: 1204,
    won: 487,
    kyc: "pending",
    status: "active",
    risk: "high",
    joined: "Jun 2022",
  },
  {
    id: "USR-004",
    name: "Priya Vasquez",
    email: "priya_v@email.com",
    balance: "$7,550",
    totalBets: 203,
    won: 98,
    kyc: "verified",
    status: "active",
    risk: "low",
    joined: "Sep 2023",
  },
  {
    id: "USR-005",
    name: "Chen Wei",
    email: "chen_w@email.com",
    balance: "$28,400",
    totalBets: 2341,
    won: 1122,
    kyc: "verified",
    status: "suspended",
    risk: "high",
    joined: "Feb 2021",
  },
  {
    id: "USR-006",
    name: "Omar Ahmed",
    email: "omar_a@email.com",
    balance: "$1,100",
    totalBets: 87,
    won: 44,
    kyc: "failed",
    status: "active",
    risk: "low",
    joined: "Dec 2023",
  },
];

export const events: AdminEvent[] = [
  {
    id: "EVT-001",
    sport: "Football",
    league: "Premier League",
    home: "Man City",
    away: "Arsenal",
    date: "Apr 5, 2026 15:00",
    status: "upcoming",
    markets: 48,
    totalBets: 2841,
    exposure: "$84,200",
  },
  {
    id: "EVT-002",
    sport: "Tennis",
    league: "ATP Tour",
    home: "Djokovic",
    away: "Alcaraz",
    date: "Apr 3, 2026 13:00",
    status: "live",
    markets: 24,
    totalBets: 1203,
    exposure: "$42,100",
  },
  {
    id: "EVT-003",
    sport: "Basketball",
    league: "NBA",
    home: "Lakers",
    away: "Warriors",
    date: "Apr 3, 2026 20:30",
    status: "live",
    markets: 62,
    totalBets: 3892,
    exposure: "$128,400",
  },
  {
    id: "EVT-004",
    sport: "Football",
    league: "La Liga",
    home: "Real Madrid",
    away: "Barcelona",
    date: "Apr 6, 2026 20:00",
    status: "upcoming",
    markets: 56,
    totalBets: 4102,
    exposure: "$195,800",
  },
  {
    id: "EVT-005",
    sport: "UFC",
    league: "UFC 310",
    home: "Jones",
    away: "Miocic",
    date: "Apr 10, 2026 22:00",
    status: "upcoming",
    markets: 18,
    totalBets: 891,
    exposure: "$31,200",
  },
];

export const transactions: AdminTransaction[] = [
  {
    id: "TXN-8821",
    user: "alex_m",
    type: "deposit",
    method: "Visa **4242",
    amount: "+$1,000",
    status: "completed",
    time: "10m ago",
  },
  {
    id: "TXN-8820",
    user: "sarah_k",
    type: "withdrawal",
    method: "Bank Transfer",
    amount: "-$3,500",
    status: "pending",
    time: "25m ago",
  },
  {
    id: "TXN-8819",
    user: "chen_w",
    type: "withdrawal",
    method: "Crypto BTC",
    amount: "-$10,000",
    status: "flagged",
    time: "1h ago",
  },
  {
    id: "TXN-8818",
    user: "priya_v",
    type: "deposit",
    method: "Mastercard **8891",
    amount: "+$500",
    status: "completed",
    time: "2h ago",
  },
  {
    id: "TXN-8817",
    user: "mike_t",
    type: "deposit",
    method: "PayPal",
    amount: "+$200",
    status: "completed",
    time: "3h ago",
  },
  {
    id: "TXN-8816",
    user: "omar_a",
    type: "withdrawal",
    method: "Bank Transfer",
    amount: "-$800",
    status: "completed",
    time: "4h ago",
  },
];

export const riskAlerts: AdminRiskAlert[] = [
  {
    id: 1,
    type: "high",
    user: "chen_w",
    message: "Unusual betting pattern - 5 large bets on correlated outcomes",
    time: "15m ago",
  },
  {
    id: 2,
    type: "high",
    user: "TXN-8819",
    message: "Large crypto withdrawal flagged for AML review ($10,000)",
    time: "1h ago",
  },
  {
    id: 3,
    type: "medium",
    user: "mike_t",
    message: "Win rate deviation detected - 94% accuracy over the last 20 bets",
    time: "2h ago",
  },
  {
    id: 4,
    type: "medium",
    user: "System",
    message: "Exposure limit approaching for Man City vs Arsenal ($84k / $100k)",
    time: "3h ago",
  },
  {
    id: 5,
    type: "low",
    user: "priya_v",
    message: "Multiple accounts sharing the same IP address detected",
    time: "5h ago",
  },
];

export const oddsRows: AdminOddsRow[] = [
  {
    event: "Man City vs Arsenal",
    market: "Match Winner",
    selectionOne: "Man City",
    oddsOne: "1.95",
    selectionTwo: "Draw",
    oddsTwo: "3.80",
    selectionThree: "Arsenal",
    oddsThree: "4.20",
    margin: "4.8%",
    status: "active",
  },
  {
    event: "Djokovic vs Alcaraz",
    market: "Match Winner",
    selectionOne: "Djokovic",
    oddsOne: "2.10",
    selectionTwo: "",
    oddsTwo: "",
    selectionThree: "Alcaraz",
    oddsThree: "1.75",
    margin: "5.1%",
    status: "suspended",
  },
  {
    event: "Lakers vs Warriors",
    market: "Spread -3.5",
    selectionOne: "Lakers -3.5",
    oddsOne: "1.91",
    selectionTwo: "",
    oddsTwo: "",
    selectionThree: "Warriors +3.5",
    oddsThree: "1.91",
    margin: "4.7%",
    status: "active",
  },
  {
    event: "Real Madrid vs Barca",
    market: "Both Score",
    selectionOne: "Yes",
    oddsOne: "1.72",
    selectionTwo: "",
    oddsTwo: "",
    selectionThree: "No",
    oddsThree: "2.10",
    margin: "5.2%",
    status: "active",
  },
];

export const chartBars: AdminChartBar[] = [
  { day: "Mon", revenue: 68, bets: 52 },
  { day: "Tue", revenue: 82, bets: 71 },
  { day: "Wed", revenue: 55, bets: 44 },
  { day: "Thu", revenue: 91, bets: 88 },
  { day: "Fri", revenue: 74, bets: 65 },
  { day: "Sat", revenue: 100, bets: 94 },
  { day: "Sun", revenue: 88, bets: 81 },
];

export const sportShare: AdminSportShare[] = [
  { sport: "Football", percentage: 38, tone: "accent" },
  { sport: "Basketball", percentage: 24, tone: "blue" },
  { sport: "Tennis", percentage: 18, tone: "gold" },
  { sport: "Cricket", percentage: 12, tone: "purple" },
  { sport: "Other", percentage: 8, tone: "muted" },
];

export const userSummaryStats: AdminSummaryStat[] = [
  { label: "Total Users", value: "48,291", tone: "blue" },
  { label: "Active Today", value: "8,420", tone: "accent" },
  { label: "Suspended", value: "134", tone: "red" },
  { label: "Pending KYC", value: "892", tone: "gold" },
];

export const transactionSummaryStats: AdminSummaryStat[] = [
  { label: "Deposits Today", value: "$284,100", tone: "accent" },
  { label: "Withdrawals", value: "$142,800", tone: "red" },
  { label: "Pending Review", value: "14", tone: "gold" },
  { label: "Flagged AML", value: "3", tone: "red" },
];

export const betSummaryStats: AdminSummaryStat[] = [
  { label: "Total Open", value: "12,847", tone: "gold" },
  { label: "Settled Today", value: "4,201", tone: "accent" },
  { label: "Voided", value: "23", tone: "red" },
  { label: "Flagged", value: "18", tone: "red" },
  { label: "Liability", value: "$2.1M", tone: "purple" },
];

export const reportCards: AdminReport[] = [
  {
    title: "Daily P&L Report",
    description: "Revenue, GGR, and margin breakdown",
    icon: DollarSign,
    tone: "accent",
    lastGenerated: "Apr 3, 2026",
  },
  {
    title: "User Activity Report",
    description: "Registrations, sessions, and retention",
    icon: Users,
    tone: "blue",
    lastGenerated: "Apr 3, 2026",
  },
  {
    title: "Bet Analysis Report",
    description: "Volume, sport breakdown, and markets",
    icon: Target,
    tone: "gold",
    lastGenerated: "Apr 2, 2026",
  },
  {
    title: "Risk & Fraud Report",
    description: "Flags, alerts, and suspicious users",
    icon: Shield,
    tone: "red",
    lastGenerated: "Apr 3, 2026",
  },
  {
    title: "AML Compliance Report",
    description: "Transactions reviewed and escalated",
    icon: Flag,
    tone: "purple",
    lastGenerated: "Apr 1, 2026",
  },
  {
    title: "Odds & Margin Report",
    description: "Margin analysis and odds movement",
    icon: TrendingUp,
    tone: "gold",
    lastGenerated: "Apr 2, 2026",
  },
];

export const settingsSections: AdminSettingSection[] = [
  {
    title: "General",
    items: [
      "Platform name",
      "Default currency",
      "Supported languages",
      "Maintenance mode",
    ],
  },
  {
    title: "Betting Rules",
    items: [
      "Min bet amount",
      "Max bet amount",
      "Max payout per bet",
      "Accumulator limit",
    ],
  },
  {
    title: "KYC & Compliance",
    items: [
      "KYC provider",
      "Auto-verify threshold",
      "Document requirements",
      "Jurisdiction rules",
    ],
  },
  {
    title: "Payment Gateways",
    items: [
      "Stripe integration",
      "Crypto wallets",
      "Bank transfer",
      "Withdrawal auto-approve",
    ],
  },
];

export const riskExposureLimits: AdminExposureLimit[] = [
  { event: "Man City vs Arsenal", used: 84, limit: 100, tone: "gold" },
  { event: "Real Madrid vs Barca", used: 196, limit: 250, tone: "accent" },
  { event: "Lakers vs Warriors", used: 128, limit: 150, tone: "red" },
];

export const riskControls: AdminRiskControl[] = [
  { label: "Max Single Bet", value: "$10,000" },
  { label: "Daily Withdrawal Limit", value: "$50,000" },
  { label: "Auto-suspend on Suspicious Activity", value: "Enabled" },
  { label: "AML Review Threshold", value: "$5,000" },
];

export const eventFilters = [
  "All",
  "Live",
  "Upcoming",
  "Completed",
  "Suspended",
] as const;

export const betFilters = [
  "All Bets",
  "Pending",
  "Won",
  "Lost",
  "Flagged",
  "Voided",
] as const;
