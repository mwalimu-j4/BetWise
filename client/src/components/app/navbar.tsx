import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Bell,
  ChevronDown,
  PlusCircle,
  Search,
  Wallet,
  Zap,
  ArrowDownToLine,
  ArrowUpFromLine,
  Settings,
  History,
  BarChart3,
  LogOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export default function Navbar() {
  const [notifications] = useState(3);
  const pathname = useLocation({
    select: (location) => location.pathname,
  });

  const balance = "KES 0.00";

  return (
    <nav className="sticky top-0 z-20 border-b border-admin-border bg-[rgba(10,14,26,0.88)] backdrop-blur-[18px]">
      <div className="mx-auto flex min-h-[76px] w-[min(1120px,calc(100%-2rem))] flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <Link to="/user" className="flex items-center gap-2.5 no-underline">
            <span className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-[linear-gradient(135deg,var(--admin-accent),#00b37a)]">
              <Zap size={16} color="#000" />
            </span>
            <span className="grid gap-0.5">
              <span className="text-sm font-bold tracking-[0.03em] text-admin-text-primary">
                BettCenic
              </span>
              <span className="text-[10px] uppercase tracking-[0.1em] text-admin-text-muted">
                User Panel
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/user"
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-medium transition",
                pathname === "/user"
                  ? "border-admin-accent/20 bg-admin-accent-dim text-admin-accent"
                  : "border-transparent text-admin-text-secondary hover:border-admin-border hover:bg-white/3 hover:text-admin-text-primary",
              )}
            >
              Home
            </Link>
            <Link
              to="/user/payments"
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-medium transition",
                pathname.startsWith("/user/payments")
                  ? "border-admin-accent/20 bg-admin-accent-dim text-admin-accent"
                  : "border-transparent text-admin-text-secondary hover:border-admin-border hover:bg-white/3 hover:text-admin-text-primary",
              )}
            >
              Payments
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="hidden min-w-0 flex-1 items-center gap-2 rounded-xl border border-admin-border bg-[rgba(22,29,53,0.75)] px-3 py-2.5 lg:inline-flex lg:min-w-[250px]">
            <Search size={14} className="text-admin-text-muted" />
            <span className="truncate text-xs text-admin-text-muted">
              Search matches, odds, teams...
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-admin-border bg-admin-card px-3 py-2">
            <Wallet size={14} className="shrink-0 text-admin-accent" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.08em] text-admin-text-muted">
                Balance
              </p>
              <p className="text-sm font-bold text-admin-text-primary">
                {balance}
              </p>
            </div>
            <Button
              className="h-8 rounded-lg bg-admin-accent px-3 text-black hover:bg-[#00d492]"
              asChild
            >
              <Link to="/user/payments">
                <PlusCircle size={14} />
                Deposit
              </Link>
            </Button>
          </div>

          <button
            aria-label="Notifications"
            className="relative grid h-10 w-10 place-items-center rounded-xl border border-admin-border bg-white/2 text-admin-text-secondary transition hover:bg-admin-hover hover:text-admin-text-primary"
            type="button"
          >
            <Bell size={18} />
            {notifications > 0 ? (
              <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-admin-red text-[8px] font-bold text-white">
                {notifications}
              </span>
            ) : null}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-9 rounded-full border-admin-border bg-transparent px-3 text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text-primary"
              >
                <span>Account</span>
                <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-52" align="end" forceMount>
              <div className="mb-1 border-b p-2 sm:hidden">
                <p className="mb-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  Current Balance
                </p>
                <p className="text-base font-bold text-emerald-600">
                  {balance}
                </p>
                <Button
                  className="mt-2 h-7 w-full gap-1 bg-emerald-600 text-xs hover:bg-emerald-700"
                  asChild
                >
                  <Link to="/user/payments">
                    <PlusCircle className="h-3 w-3" /> Deposit
                  </Link>
                </Button>
              </div>

              <DropdownMenuSeparator className="sm:hidden" />

              <DropdownMenuLabel className="py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                Finance
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem className="cursor-pointer py-1.5" asChild>
                  <Link to="/user/payments">
                    <ArrowDownToLine className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    <span>Deposit</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-1.5" asChild>
                  <Link to="/user/payments/withdrawal">
                    <ArrowUpFromLine className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    <span>Withdrawal</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-1.5" asChild>
                  <Link to="/user/payments">
                    <Wallet className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    <span>My Wallet</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                Activity
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem className="cursor-pointer py-1.5">
                  <Settings className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-1.5" asChild>
                  <Link to="/user/payments/history">
                    <History className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    <span>Transaction History</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-1.5" asChild>
                  <Link to="/user/payments/statements">
                    <BarChart3 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    <span>Statements</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuItem className="cursor-pointer py-1.5 text-red-600 focus:bg-red-100 focus:text-red-600 dark:focus:bg-red-900/30">
                <LogOut className="mr-2 h-3.5 w-3.5" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
