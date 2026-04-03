import { useState } from "react";
import {
  Bell,
  Moon,
  Sun,
  User,
  ChevronDown,
  LayoutDashboard,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Settings,
  History,
  BarChart3,
  LogOut,
  PlusCircle,
  Balloon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "../ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";


export default function Navbar() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Mock balance
  const balance = "KES 0.00"

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
        {/* Left: Logo & Brand */}
        <div className="flex items-center gap-8">
          <a
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <Balloon className="h-7 w-7 text-emerald-500" />
            <span className="text-xl font-bold tracking-tight text-primary">
              BETTCENIC
            </span>
          </a>

          {/* Main Navigation (Desktop) */}
          <div className="hidden md:flex items-center gap-1">
            <Button variant="ghost" className="text-sm font-medium">
              Home
            </Button>
            <Button variant="ghost" className="text-sm font-medium">
              Pre-match
            </Button>
            <Button variant="ghost" className="text-sm font-medium">
              Live
            </Button>
          </div>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-3 md:gap-5">
          {/* Balance & Quick Deposit */}
          <div className="hidden sm:flex items-center rounded-md border bg-muted/50 p-1">
            <div className="flex items-center px-3 py-1">
              <span className="text-xs text-muted-foreground mr-2">
                Balance:
              </span>
              <span className="text-sm font-bold">{balance}</span>
            </div>
            <Button
              size="sm"
              className="h-7 px-3 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Deposit
            </Button>
          </div>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9"
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full h-9 w-9"
          >
            <Bell className="h-4 w-4" />
            <Badge className="absolute top-1 right-1.5 h-2 w-2 rounded-full p-0 bg-red-500 border border-background" />
          </Button>

          {/* Account Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 rounded-full pl-3 pr-2 h-9 border-muted-foreground/20"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium hidden md:inline-block">
                  Account
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-56" align="end" forceMount>
              {/* Mobile Balance View (Shows only on small screens) */}
              <div className="sm:hidden p-3 border-b mb-1">
                <p className="text-xs text-muted-foreground mb-1">
                  Current Balance
                </p>
                <p className="text-lg font-bold text-emerald-600">{balance}</p>
                <Button className="w-full mt-2 h-8 gap-1 bg-emerald-600 hover:bg-emerald-700">
                  <PlusCircle className="h-3.5 w-3.5" /> Deposit
                </Button>
              </div>

              <DropdownMenuGroup>
                <DropdownMenuItem className="cursor-pointer">
                  <LayoutDashboard className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                Finance
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem className="cursor-pointer">
                  <ArrowDownToLine className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Deposit</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <ArrowUpFromLine className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Withdrawal</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Wallet className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>My Wallet</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                Activity
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <History className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>My Bets</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <BarChart3 className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>My Results</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-100 dark:focus:bg-red-900/30">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
