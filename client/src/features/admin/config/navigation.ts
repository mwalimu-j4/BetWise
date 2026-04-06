import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  Mail,
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
  | "newsletter"
  | "settings";

export type AdminNavCategory = "core" | "operations" | "insights" | "system";

export interface AdminNavSection {
  id: AdminNavId;
  label: string;
  category: AdminNavCategory;
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
    | "/admin/newsletter"
    | "/admin/settings";
}

export const adminNavigation: AdminNavSection[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    category: "core",
    icon: LayoutDashboard,
    to: "/admin/dashboard",
  },
  {
    id: "users",
    label: "Users",
    category: "core",
    icon: Users,
    to: "/admin/users",
  },
  {
    id: "bets",
    label: "Bets",
    category: "core",
    icon: Target,
    to: "/admin/bets",
  },
  {
    id: "transactions",
    label: "Payments",
    category: "core",
    icon: CreditCard,
    to: "/admin/transactions",
  },
  {
    id: "withdrawals",
    label: "Withdrawals",
    category: "core",
    icon: ArrowUpRight,
    to: "/admin/withdrawals",
  },
  {
    id: "events",
    label: "Events",
    category: "operations",
    icon: Trophy,
    to: "/admin/events",
  },
  {
    id: "odds",
    label: "Odds",
    category: "operations",
    icon: SlidersHorizontal,
    to: "/admin/odds",
  },
  {
    id: "risk",
    label: "Risk",
    category: "operations",
    icon: Shield,
    to: "/admin/risk",
  },
  {
    id: "analytics",
    label: "Analytics",
    category: "insights",
    icon: BarChart3,
    to: "/admin/analytics",
  },
  {
    id: "reports",
    label: "Reports",
    category: "insights",
    icon: BarChart3,
    to: "/admin/reports",
  },
  {
    id: "contacts",
    label: "Messages",
    category: "insights",
    icon: MessageSquare,
    to: "/admin/contacts",
  },
  {
    id: "newsletter",
    label: "Newsletter",
    category: "operations",
    icon: Mail,
    to: "/admin/newsletter",
  },
  {
    id: "settings",
    label: "Settings",
    category: "system",
    icon: Settings,
    to: "/admin/settings",
  },
];
