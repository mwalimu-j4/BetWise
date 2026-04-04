import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  ChevronDown,
  Circle,
  House,
  ShieldCheck,
  Star,
  Ticket,
  Trophy,
  Tv,
  Volleyball,
  Goal,
  CircleDot,
  Shield,
  Dumbbell,
  Cherry,
  Gem,
  Swords,
} from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

type RouteTo =
  | "/user"
  | "/user/login"
  | "/user/register"
  | "/user/payments"
  | "/user/payments/deposit"
  | "/user/payments/withdrawal"
  | "/user/payments/history";

type SidebarLink = {
  label: string;
  to: RouteTo;
  icon?: LucideIcon;
};

type SportGroup = {
  key: string;
  label: string;
  icon: LucideIcon;
  children: SidebarLink[];
};

type SidebarProps = {
  collapsed: boolean;
  onCollapseToggle: () => void;
  onNavigate?: () => void;
};

const mainLinks: SidebarLink[] = [
  { label: "Homepage", to: "/user", icon: House },
  { label: "Pre-match", to: "/user/payments", icon: Trophy },
  { label: "Live", to: "/user/payments/deposit", icon: Tv },
];

const topLeagueLinks: SidebarLink[] = [
  { label: "UEFA Champions League", to: "/user" },
  { label: "Championship", to: "/user/payments/history" },
];

const sportGroups: SportGroup[] = [
  {
    key: "football",
    label: "Football",
    icon: Goal,
    children: [
      { label: "UEFA Champions League", to: "/user" },
      { label: "Championship", to: "/user/payments" },
      { label: "Copa Libertadores", to: "/user/register" },
    ],
  },
  {
    key: "basketball",
    label: "Basketball",
    icon: Volleyball,
    children: [
      { label: "NCAAB", to: "/user/login" },
      { label: "NBA", to: "/user/payments" },
      { label: "Basketball Euroleague", to: "/user" },
      { label: "NBL", to: "/user/register" },
      { label: "WNCAAB", to: "/user/payments/history" },
    ],
  },
  {
    key: "american-football",
    label: "American Football",
    icon: Shield,
    children: [{ label: "NCAAF", to: "/user/login" }],
  },
  {
    key: "baseball",
    label: "Baseball",
    icon: CircleDot,
    children: [
      { label: "MLB Preseason", to: "/user" },
      { label: "NCAA Baseball", to: "/user/payments" },
      { label: "MLB", to: "/user/register" },
    ],
  },
  {
    key: "ice-hockey",
    label: "Ice Hockey",
    icon: Cherry,
    children: [
      { label: "SHL", to: "/user/login" },
      { label: "NHL", to: "/user/payments" },
      { label: "AHL", to: "/user/register" },
      { label: "Liiga", to: "/user" },
      { label: "Mestis", to: "/user/payments/history" },
      { label: "HockeyAllsvenskan", to: "/user/register" },
    ],
  },
  {
    key: "cricket",
    label: "Cricket",
    icon: Dumbbell,
    children: [
      { label: "International Twenty20", to: "/user" },
      { label: "T20 World Cup", to: "/user/payments" },
      { label: "One Day Internationals", to: "/user/register" },
    ],
  },
  {
    key: "mma",
    label: "MMA",
    icon: Swords,
    children: [{ label: "MMA", to: "/user/login" }],
  },
];

const quickLinks: SidebarLink[] = [
  { label: "Favorites", to: "/user", icon: Star },
  { label: "My Bets", to: "/user/payments", icon: Ticket },
  { label: "Analytics", to: "/user/payments/history", icon: BarChart3 },
  { label: "Responsible Gambling", to: "/user/register", icon: ShieldCheck },
];

function SectionHeading({
  collapsed,
  label,
}: {
  collapsed: boolean;
  label: string;
}) {
  if (collapsed) return null;

  return (
    <p className="mt-5 mb-2 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground/70">
      {label}
    </p>
  );
}

function ItemLink({
  link,
  itemKey,
  collapsed,
  isSelected,
  icon,
  onSelect,
  onNavigate,
}: {
  link: SidebarLink;
  itemKey: string;
  collapsed: boolean;
  isSelected: boolean;
  icon?: LucideIcon;
  onSelect: (itemKey: string) => void;
  onNavigate?: () => void;
}) {
  const ItemIcon = icon;

  return (
    <Link
      to={link.to}
      onClick={() => {
        onSelect(itemKey);
        onNavigate?.();
      }}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors sm:text-[0.95rem]",
        isSelected
          ? "bg-accent text-accent-foreground"
          : "text-primary-foreground/90 hover:bg-secondary/25 hover:text-primary-foreground",
        collapsed && "justify-center px-0",
      )}
      activeProps={{ className: "bg-accent text-accent-foreground" }}
      title={collapsed ? link.label : undefined}
    >
      {ItemIcon ? (
        <ItemIcon className="h-4 w-4 shrink-0" />
      ) : (
        <Circle className="h-2.5 w-2.5 shrink-0" />
      )}
      {!collapsed ? <span className="truncate">{link.label}</span> : null}
    </Link>
  );
}

export default function Sidebar({
  collapsed,
  onCollapseToggle,
  onNavigate,
}: SidebarProps) {
  const location = useLocation();
  const [openTopLeagues, setOpenTopLeagues] = useState(true);
  const [openSports, setOpenSports] = useState<Record<string, boolean>>({
    football: true,
    basketball: true,
  });
  const [selectedItemKey, setSelectedItemKey] = useState("main-homepage");

  const activePath = location.pathname;

  const activeSportGroupKey = useMemo(() => {
    const found = sportGroups.find((group) =>
      group.children.some((child) => child.to === activePath),
    );
    return found?.key ?? null;
  }, [activePath]);

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-primary text-primary-foreground",
        collapsed ? "w-[84px]" : "w-[300px]",
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-border",
          collapsed ? "justify-center" : "justify-between px-4",
        )}
      >
        {!collapsed ? (
          <Link to="/user" className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary ring-2 ring-primary-foreground/30">
              <Gem className="h-4.5 w-4.5 text-accent" />
            </div>
            <span className="text-lg font-black tracking-tight sm:text-xl">
              BETT<span className="text-accent">CENIC</span>
            </span>
          </Link>
        ) : (
          <Link
            to="/user"
            className="grid h-9 w-9 place-items-center rounded-full bg-secondary ring-2 ring-primary-foreground/30"
          >
            <Gem className="h-4.5 w-4.5 text-accent" />
          </Link>
        )}

        {!collapsed ? (
          <button
            type="button"
            onClick={onCollapseToggle}
            className="rounded-md p-2 text-primary-foreground/90 hover:bg-secondary/25"
            aria-label="Collapse sidebar"
          >
            <ChevronDown className="h-4 w-4 -rotate-90" />
          </button>
        ) : null}
      </div>

      <div className="scrollbar-thin scrollbar-thumb-primary-foreground/20 flex-1 overflow-y-auto p-3">
        <div className="grid gap-1.5">
          {mainLinks.map((link, index) => (
            <ItemLink
              key={link.label}
              link={link}
              itemKey={`main-${index}`}
              icon={link.icon}
              collapsed={collapsed}
              isSelected={selectedItemKey === `main-${index}`}
              onSelect={setSelectedItemKey}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        <SectionHeading collapsed={collapsed} label="Top Leagues" />
        {!collapsed ? (
          <button
            type="button"
            onClick={() => setOpenTopLeagues((prev) => !prev)}
            className={cn(
              "mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors sm:text-[0.95rem]",
              openTopLeagues
                ? "bg-secondary/30 text-primary-foreground"
                : "text-primary-foreground/90 hover:bg-secondary/25",
            )}
          >
            <span>Top Leagues</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                openTopLeagues ? "rotate-0" : "-rotate-90",
              )}
            />
          </button>
        ) : null}

        {openTopLeagues && !collapsed ? (
          <div className="grid gap-1 pl-2">
            {topLeagueLinks.map((link, index) => (
              <ItemLink
                key={link.label}
                link={link}
                itemKey={`top-${index}`}
                collapsed={false}
                isSelected={selectedItemKey === `top-${index}`}
                onSelect={setSelectedItemKey}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ) : null}

        <SectionHeading collapsed={collapsed} label="All Sports" />
        <div className="grid gap-1">
          {sportGroups.map((group) => {
            const GroupIcon = group.icon;
            const groupOpen = openSports[group.key] ?? false;
            const groupIsActive = activeSportGroupKey === group.key;

            return (
              <div key={group.key}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenSports((prev) => ({
                      ...prev,
                      [group.key]: !groupOpen,
                    }))
                  }
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors sm:text-[0.95rem]",
                    collapsed && "justify-center px-0",
                    groupOpen || groupIsActive
                      ? "bg-accent text-accent-foreground"
                      : "text-primary-foreground/90 hover:bg-secondary/25 hover:text-primary-foreground",
                  )}
                  title={collapsed ? group.label : undefined}
                >
                  <GroupIcon className="h-4 w-4 shrink-0" />
                  {!collapsed ? (
                    <span className="truncate">{group.label}</span>
                  ) : null}
                  {!collapsed ? (
                    <ChevronDown
                      className={cn(
                        "ml-auto h-4 w-4 transition-transform",
                        groupOpen ? "rotate-0" : "-rotate-90",
                      )}
                    />
                  ) : null}
                </button>

                {groupOpen && !collapsed ? (
                  <div className="mt-1 grid gap-1 pl-2">
                    {group.children.map((child, childIndex) => (
                      <ItemLink
                        key={`${group.key}-${child.label}`}
                        link={child}
                        itemKey={`${group.key}-${childIndex}`}
                        collapsed={false}
                        isSelected={
                          selectedItemKey === `${group.key}-${childIndex}`
                        }
                        onSelect={setSelectedItemKey}
                        onNavigate={onNavigate}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <SectionHeading collapsed={collapsed} label="Quick Access" />
        <div className="grid gap-1">
          {quickLinks.map((link, index) => (
            <ItemLink
              key={link.label}
              link={link}
              itemKey={`quick-${index}`}
              icon={link.icon}
              collapsed={collapsed}
              isSelected={selectedItemKey === `quick-${index}`}
              onSelect={setSelectedItemKey}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}


