import { Link } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  LogOut,
  Settings,
  User,
  Wallet,
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
} from "@/components/ui/dropdown-menu";

type UserMenuProps = {
  balance: string;
};

export default function UserMenu({ balance }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-10 rounded-full border-admin-border bg-transparent px-3 text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text-primary"
        >
          <User className="mr-1 h-4 w-4" />
          <span className="text-sm">Account</span>
          <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-60 border-admin-border bg-primary p-1 text-admin-text-primary"
        align="end"
        forceMount
      >
        <div className="mb-2 rounded-lg border border-admin-border bg-admin-surface/50 p-2 sm:hidden">
          <p className="mb-0.5 text-[10px] uppercase tracking-wider text-admin-text-muted">
            Current Balance
          </p>
          <p className="text-base font-bold text-admin-accent">{balance}</p>
        </div>

        <DropdownMenuLabel className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-admin-text-muted">
          Finance
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="group mx-1 cursor-pointer rounded-lg px-3 py-2 text-sm transition hover:bg-admin-accent-dim hover:text-admin-accent"
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
            className="group mx-1 cursor-pointer rounded-lg px-3 py-2 text-sm transition hover:bg-admin-accent-dim hover:text-admin-accent"
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
            className="group mx-1 cursor-pointer rounded-lg px-3 py-2 text-sm transition hover:bg-admin-accent-dim hover:text-admin-accent"
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

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem className="group mx-1 cursor-pointer rounded-lg px-3 py-2 text-sm transition hover:bg-admin-accent-dim hover:text-admin-accent">
            <Settings className="mr-2 h-4 w-4 text-admin-text-muted group-hover:text-admin-accent" />
            <span>My Profile</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="group mx-1 cursor-pointer rounded-lg px-3 py-2 text-sm text-admin-text-secondary transition hover:bg-admin-hover hover:text-admin-text-primary">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
