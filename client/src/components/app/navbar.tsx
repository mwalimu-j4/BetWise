import { useState } from "react";
import { Link } from "@tanstack/react-router";
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

  const balance = "KES 0.00";

  return (
    <nav className="user-navbar">
      <div className="user-navbar__inner">
        <div className="user-brand-group">
          <Link to="/user" className="user-brand-link">
            <span className="user-brand-mark">
              <Zap size={16} color="#000" />
            </span>
            <span className="user-brand-copy">
              <span className="user-brand-name">BettCenic</span>
              <span className="user-brand-label">User Panel</span>
            </span>
          </Link>

          <div className="user-nav-links">
            <Link to="/user" className="user-nav-link">
              Home
            </Link>
            <Link to="/user/payments" className="user-nav-link">
              Payments
            </Link>
          </div>
        </div>

        <div className="user-navbar__actions">
          <div className="user-search-pill">
            <Search size={14} className="user-text-muted" />
            <span className="user-text-muted">
              Search matches, odds, teams...
            </span>
          </div>

          <div className="user-balance-pill" data-tone="accent">
            <Wallet size={14} />
            <div>
              <p className="user-balance-pill__label">Balance</p>
              <p className="user-balance-pill__value">{balance}</p>
            </div>
            <Button className="user-deposit-button" asChild>
              <Link to="/user/payments">
                <PlusCircle size={14} />
                Deposit
              </Link>
            </Button>
          </div>

          <button
            aria-label="Notifications"
            className="admin-icon-trigger admin-icon-trigger--notification"
            type="button"
          >
            <Bell size={18} />
            {notifications > 0 ? (
              <span className="admin-notification-badge">{notifications}</span>
            ) : null}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="user-account-trigger h-9 px-3"
              >
                <span>Account</span>
                <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>

            {/* Tightened width to w-52 */}
            <DropdownMenuContent
              className="user-dropdown-content w-52"
              align="end"
              forceMount
            >
              {/* Mobile Balance View: Tighter padding and text sizes */}
              <div className="user-dropdown-mobile-balance">
                <p className="text-[11px] text-muted-foreground mb-0.5 uppercase tracking-wider">
                  Current Balance
                </p>
                <p className="text-base font-bold text-emerald-600">
                  {balance}
                </p>
                <Button className="user-dropdown-mobile-deposit" asChild>
                  <Link to="/user/payments">
                    <PlusCircle className="h-3 w-3" /> Deposit
                  </Link>
                </Button>
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase tracking-wider py-1.5">
                Finance
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem className="cursor-pointer py-1.5" asChild>
                  <Link to="/user/payments">
                    <ArrowDownToLine className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    <span>Deposit</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-1.5">
                  <ArrowUpFromLine className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <span>Withdrawal</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-1.5">
                  <Wallet className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <span>My Wallet</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase tracking-wider py-1.5">
                Activity
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem className="cursor-pointer py-1.5">
                  <Settings className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-1.5">
                  <History className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <span>My Bets</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-1.5">
                  <BarChart3 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <span>My Results</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuItem className="cursor-pointer py-1.5 text-red-600 focus:text-red-600 focus:bg-red-100 dark:focus:bg-red-900/30">
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
