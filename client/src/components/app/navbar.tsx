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
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Navbar() {
  const [notifications, setNotifications] = useState(3);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const pathname = useLocation({
    select: (location) => location.pathname,
  });

  const balance = "KES 0.00";

  const mockNotifications = [
    {
      id: 1,
      title: "Bet Won!",
      message: "Your bet on Team A was successful",
      time: "2 min ago",
    },
    {
      id: 2,
      title: "Deposit Confirmed",
      message: "KES 5,000 has been added to your account",
      time: "1 hour ago",
    },
    {
      id: 3,
      title: "Event Updated",
      message: "Match starting in 30 minutes",
      time: "3 hours ago",
    },
  ];

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
              <Link to="/user/payments/deposit">
                <PlusCircle size={14} />
                Deposit
              </Link>
            </Button>
          </div>

          <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <DialogTrigger asChild>
              <button
                aria-label="Notifications"
                className="relative text-admin-text-secondary transition hover:text-admin-text-primary"
                type="button"
              >
                <Bell size={18} />
                {notifications > 0 ? (
                  <span className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-admin-red text-[8px] font-bold text-white">
                    {notifications}
                  </span>
                ) : null}
              </button>
            </DialogTrigger>
            <DialogContent className="border-admin-border bg-[rgba(10,14,26,0.98)] text-admin-text-primary">
              <DialogHeader>
                <DialogTitle className="text-admin-text-primary">Notifications</DialogTitle>
                <DialogDescription className="text-admin-text-muted">
                  You have {notifications} new notification
                  {notifications !== 1 ? "s" : ""}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[300px] w-full pr-4">
                <div className="flex flex-col gap-3">
                  {mockNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="group rounded-lg border border-admin-border bg-[rgba(22,29,53,0.6)] p-3 transition hover:bg-admin-accent-dim hover:border-admin-accent/30 cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-admin-text-primary group-hover:text-admin-accent transition">
                            {notification.title}
                          </p>
                          <p className="text-xs text-admin-text-muted mt-1">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-admin-text-muted mt-1.5">
                            {notification.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

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

            <DropdownMenuContent
              className="w-56 border-admin-border bg-[rgba(10,14,26,0.98)] text-admin-text-primary p-1"
              align="end"
              forceMount
            >
              <div className="mb-2 rounded-lg border border-admin-border bg-[rgba(22,29,53,0.4)] p-2 sm:hidden">
                <p className="mb-0.5 text-[10px] uppercase tracking-wider text-admin-text-muted">
                  Current Balance
                </p>
                <p className="text-base font-bold text-admin-accent">
                  {balance}
                </p>
                <Button
                  className="mt-2 h-7 w-full gap-1 bg-admin-accent text-xs font-semibold text-black hover:bg-[#00d492]"
                  asChild
                >
                  <Link to="/user/payments/deposit">
                    <PlusCircle className="h-3 w-3" /> Deposit
                  </Link>
                </Button>
              </div>

              <div className="py-1">
                <DropdownMenuLabel className="px-3 py-2 text-[10px] uppercase tracking-wider text-admin-text-muted font-semibold">
                  Finance
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    className="mx-1 px-3 py-2 rounded-lg cursor-pointer text-sm transition hover:bg-admin-accent-dim hover:text-admin-accent group"
                    asChild
                  >
                    <Link
                      to="/user/payments/deposit"
                      className="flex items-center gap-2 no-underline"
                    >
                      <ArrowDownToLine className="h-4 w-4 text-admin-text-muted group-hover:text-admin-accent" />
                      <span>Deposit</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="mx-1 px-3 py-2 rounded-lg cursor-pointer text-sm transition hover:bg-admin-accent-dim hover:text-admin-accent group"
                    asChild
                  >
                    <Link
                      to="/user/payments/withdrawal"
                      className="flex items-center gap-2 no-underline"
                    >
                      <ArrowUpFromLine className="h-4 w-4 text-admin-text-muted group-hover:text-admin-accent" />
                      <span>Withdrawal</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="mx-1 px-3 py-2 rounded-lg cursor-pointer text-sm transition hover:bg-admin-accent-dim hover:text-admin-accent group"
                    asChild
                  >
                    <Link
                      to="/user/payments/history"
                      className="flex items-center gap-2 no-underline"
                    >
                      <Wallet className="h-4 w-4 text-admin-text-muted group-hover:text-admin-accent" />
                      <span>Transaction History</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </div>

              <div className="py-1">
                <DropdownMenuLabel className="px-3 py-2 text-[10px] uppercase tracking-wider text-admin-text-muted font-semibold">
                  Settings
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem className="mx-1 px-3 py-2 rounded-lg cursor-pointer text-sm transition hover:bg-admin-accent-dim hover:text-admin-accent group">
                    <Settings className="mr-2 h-4 w-4 text-admin-text-muted group-hover:text-admin-accent" />
                    <span>My Profile</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </div>

              <DropdownMenuItem className="mx-1 mt-1 px-3 py-2 rounded-lg cursor-pointer text-sm text-red-500 transition hover:bg-red-500/15 hover:text-red-400 group">
                <LogOut className="mr-2 h-4 w-4 text-red-500 group-hover:text-red-400" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
