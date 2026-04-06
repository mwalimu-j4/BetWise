import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Shield,
  SlidersHorizontal,
  Target,
  Trophy,
  Users,
  ArrowUpRight,
} from "lucide-react";

export type AdminNavId =
  | "dashboard"
  | "users"
  | "analytics"
  | "bets"
  | "contacts"
  | "events"
  | "odds"
  | "transactions"
  | "withdrawals"
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
    | "/admin/analytics"
    | "/admin/bets"
    | "/admin/contacts"
    | "/admin/events"
    | "/admin/odds"
    | "/admin/transactions"
    | "/admin/withdrawals"
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
    label: "Users",
    icon: Users,
    to: "/admin/users",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    to: "/admin/analytics",
  },
  {
    id: "bets",
    label: "Bets",
    icon: Target,
    to: "/admin/bets",
  },
  {
    id: "contacts",
    label: "Messages",
    icon: MessageSquare,
    to: "/admin/contacts",
  },
  {
    id: "events",
    label: "Events",
    icon: Trophy,
    to: "/admin/events",
  },
  {
    id: "odds",
    label: "Odds",
    icon: SlidersHorizontal,
    to: "/admin/odds",
  },
  {
    id: "transactions",
    label: "Payments",
    icon: CreditCard,
    to: "/admin/transactions",
  },
  {
    id: "withdrawals",
    label: "Withdrawals",
    icon: ArrowUpRight,
    to: "/admin/withdrawals",
  },
  {
    id: "risk",
    label: "Risk",
    icon: Shield,
    to: "/admin/risk",
  },
  {
    id: "reports",
    label: "Reports",
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
