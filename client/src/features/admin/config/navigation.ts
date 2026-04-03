import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  Settings,
  Shield,
  SlidersHorizontal,
  Target,
  Trophy,
  Users,
} from "lucide-react";

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

export interface AdminNavSection {
  id: AdminNavId;
  label: string;
  icon: LucideIcon;
  to:
    | "/admin/dashboard"
    | "/admin/users"
    | "/admin/bets"
    | "/admin/events"
    | "/admin/odds"
    | "/admin/transactions"
    | "/admin/risk"
    | "/admin/reports"
    | "/admin/settings";
}

export const adminNavigation: AdminNavSection[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    to: "/admin/dashboard",
  },
  {
    id: "users",
    label: "User Management",
    icon: Users,
    to: "/admin/users",
  },
  {
    id: "bets",
    label: "Bet Management",
    icon: Target,
    to: "/admin/bets",
  },
  {
    id: "events",
    label: "Events & Sports",
    icon: Trophy,
    to: "/admin/events",
  },
  {
    id: "odds",
    label: "Odds Control",
    icon: SlidersHorizontal,
    to: "/admin/odds",
  },
  {
    id: "transactions",
    label: "Transactions",
    icon: CreditCard,
    to: "/admin/transactions",
  },
  {
    id: "risk",
    label: "Risk Management",
    icon: Shield,
    to: "/admin/risk",
  },
  {
    id: "reports",
    label: "Reports & Analytics",
    icon: BarChart3,
    to: "/admin/reports",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    to: "/admin/settings",
  },
];
