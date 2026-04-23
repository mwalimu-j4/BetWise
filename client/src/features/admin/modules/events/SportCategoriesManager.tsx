import { api } from "@/api/axiosConfig";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckSquare,
  Loader2,
  RefreshCw,
  Settings2,
  Shield,
  Square,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AdminCard,
  AdminSectionHeader,
  AdminStatCard,
} from "../../components/ui";

interface SportCategory {
  id: string;
  sportKey: string;
  displayName: string;
  apiSportId: string | null;
  icon: string;
  isActive: boolean;
  showInNav: boolean;
  sortOrder: number;
  eventCount: number;
  lastSyncedAt: string | null;
  configuredBy: string | null;
  liveEventCount?: number;
  oddsAvailable?: boolean;
  marginQuality?: "good" | "fair" | "poor" | "none";
  averageBookmakerMargin?: number;
  warning?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CategoriesResponse {
  categories: SportCategory[];
  totalActive: number;
  totalInactive: number;
}

interface SyncStatus {
  progress: number;
  currentSport: string;
  done: boolean;
  totalConfigured: number;
  totalSports: number;
  completedSports: number;
}

function formatSyncTime(timestamp: string | null) {
  if (!timestamp) return "Never synced";
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const sec = diffMs / 1000;
  if (sec < 60) return `${Math.floor(sec)}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getEventCountHealth(count: number): {
  color: string;
  bg: string;
  label: string;
} {
  if (count === 0) return { color: "text-red-400", bg: "bg-red-500/10", label: "No events" };
  if (count < 5) return { color: "text-amber-400", bg: "bg-amber-500/10", label: "Low" };
  return { color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Healthy" };
}

function getMarginIndicator(quality: SportCategory["marginQuality"]) {
  if (quality === "good") return { color: "text-emerald-400", label: "Good margin" };
  if (quality === "fair") return { color: "text-amber-400", label: "Fair margin" };
  if (quality === "poor") return { color: "text-red-400", label: "Poor margin" };
  return { color: "text-admin-text-muted", label: "No margin" };
}

export default function SportCategoriesManager() {
  const [categories, setCategories] = useState<SportCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [configuring, setConfiguring] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const totalActive = useMemo(
    () => categories.filter((c) => c.isActive).length,
    [categories],
  );
  const totalInactive = useMemo(
    () => categories.filter((c) => !c.isActive).length,
    [categories],
  );
  const totalEvents = useMemo(
    () =>
      categories.reduce(
        (sum, c) => sum + (c.liveEventCount ?? c.eventCount ?? 0),
        0,
      ),
    [categories],
  );
  const sportsWithNoEvents = useMemo(
    () => categories.filter((c) => c.isActive && c.eventCount === 0).length,
    [categories],
  );

  const loadCategories = useCallback(
    async (options?: { background?: boolean }) => {
      if (options?.background) setRefreshing(true);
      else setLoading(true);
      try {
        const { data } = await api.get<CategoriesResponse>(
          "/admin/sport-categories",
        );
        setCategories(data.categories);
      } catch {
        toast.error("Failed to load sport categories");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  const handleToggle = useCallback(async (category: SportCategory) => {
    setToggling(category.id);
    try {
      const { data } = await api.patch<SportCategory>(
        `/admin/sport-categories/${category.id}/toggle`,
      );
      setCategories((prev) =>
        prev.map((c) =>
          c.id === data.id ? { ...c, isActive: data.isActive } : c,
        ),
      );
      toast.success(
        data.isActive
          ? `${category.displayName} activated`
          : `${category.displayName} deactivated`,
      );
    } catch {
      toast.error("Failed to toggle category");
    } finally {
      setToggling(null);
    }
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedKeys(new Set(categories.map((c) => c.sportKey)));
  }, [categories]);

  const handleDeselectAll = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  const toggleSelect = useCallback((sportKey: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(sportKey)) {
        next.delete(sportKey);
      } else {
        next.add(sportKey);
      }
      return next;
    });
  }, []);

  const handleConfigure = useCallback(async () => {
    if (selectedKeys.size === 0) {
      toast.error("Select at least one sport to configure");
      return;
    }
    setConfiguring(true);
    setSyncStatus({
      progress: 0,
      currentSport: "",
      done: false,
      totalConfigured: 0,
      totalSports: selectedKeys.size,
      completedSports: 0,
    });
    try {
      await api.post("/admin/sport-categories/bulk-configure", {
        sportKeys: Array.from(selectedKeys),
        houseMargin: 5,
      });
      const pollInterval = window.setInterval(async () => {
        try {
          const { data } = await api.get<SyncStatus>(
            "/admin/sport-categories/sync-status",
          );
          setSyncStatus(data);
          if (data.done) {
            window.clearInterval(pollInterval);
            setConfiguring(false);
            toast.success(
              `${data.totalSports} sports configured | ${(data.totalConfigured ?? 0).toLocaleString()} events loaded`,
            );
            setSelectedKeys(new Set());
            void loadCategories({ background: true });
          }
        } catch {
          window.clearInterval(pollInterval);
          setConfiguring(false);
        }
      }, 1500);
    } catch {
      setConfiguring(false);
      setSyncStatus(null);
      toast.error("Failed to start bulk configure");
    }
  }, [selectedKeys, loadCategories]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadCategories({ background: true });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [loadCategories]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 animate-pulse rounded-2xl border border-white/5 bg-white/5" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`cat-skel-${i}`}
              className="h-20 animate-pulse rounded-xl border border-white/5 bg-white/5"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl border border-white/5 bg-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <AdminSectionHeader
        title="Sport Categories"
        subtitle="Configure which sports appear on the user sidebar and fetch events from the odds API."
        actions={
          <div className="grid w-full gap-1.5 sm:flex sm:w-auto sm:items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadCategories({ background: true })}
              disabled={refreshing}
              className="w-full border-admin-border bg-admin-card text-admin-text-primary hover:bg-admin-surface sm:w-auto"
            >
              {refreshing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Refresh
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <AdminStatCard
          label="Total"
          value={String(categories.length)}
          tone="blue"
        />
        <AdminStatCard label="Active" value={String(totalActive)} tone="live" />
        <AdminStatCard
          label="Total Events"
          value={(totalEvents ?? 0).toLocaleString()}
          tone="accent"
        />
        <AdminStatCard
          label="Total Events"
          value={(totalEvents ?? 0).toLocaleString()}
          tone="accent"
        />
        <AdminStatCard
          label="Sports Empty"
          value={String(sportsWithNoEvents)}
          tone={sportsWithNoEvents > 0 ? "gold" : "blue"}
        />
      </div>

      {/* Toolbar */}
      <AdminCard className="px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-admin-text-muted/70">
            <span className="font-bold text-admin-text-primary">
              {categories.length}
            </span>{" "}
            sports available ·{" "}
            <span className="font-bold text-emerald-400">
              {totalActive}
            </span>{" "}
            active ·{" "}
            <span className="font-bold text-red-400">
              {totalInactive}
            </span>{" "}
            inactive
            {sportsWithNoEvents > 0 && (
              <>
                {" · "}
                <span className="font-bold text-amber-400">
                  ⚠ {sportsWithNoEvents} with no events
                </span>
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="h-7 border-admin-border bg-admin-surface/40 text-[11px] text-admin-text-primary hover:bg-admin-surface"
            >
              <CheckSquare className="mr-1 size-3" />
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              className="h-7 border-admin-border bg-admin-surface/40 text-[11px] text-admin-text-primary hover:bg-admin-surface"
            >
              <Square className="mr-1 size-3" />
              Deselect All
            </Button>
            <Button
              size="sm"
              onClick={() => void handleConfigure()}
              disabled={configuring || selectedKeys.size === 0}
              className="h-7 bg-admin-accent text-[11px] font-bold text-black hover:bg-admin-accent/90 disabled:opacity-50"
            >
              {configuring ? (
                <Loader2 className="mr-1 size-3 animate-spin" />
              ) : (
                <Settings2 className="mr-1 size-3" />
              )}
              Configure Selected ({selectedKeys.size})
            </Button>
          </div>
        </div>
      </AdminCard>

      {/* Progress bar */}
      {configuring && syncStatus && (
        <AdminCard className="border-admin-accent/30 p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-admin-accent">
                Configuring: {syncStatus.currentSport || "Starting..."}
              </span>
              <span className="tabular-nums text-admin-text-muted/80">
                {syncStatus.completedSports}/{syncStatus.totalSports} sports ·{" "}
                {(syncStatus.totalConfigured ?? 0).toLocaleString()} events
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full border border-white/5 bg-white/5">
              <div
                className="h-full animate-[shimmer_2s_linear_infinite] rounded-full bg-gradient-to-r from-admin-accent via-amber-400 to-admin-accent bg-[length:200%_auto] shadow-[0_0_10px_rgba(245,197,24,0.3)] transition-all duration-700"
                style={{ width: `${syncStatus.progress}%` }}
              />
            </div>
            <p className="text-right font-mono text-[10px] text-admin-text-muted/60">
              {syncStatus.progress}% COMPLETE
            </p>
          </div>
        </AdminCard>
      )}

      {/* Sport cards grid */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const isSelected = selectedKeys.has(category.sportKey);
          const isTogglingThis = toggling === category.id;
          const eventCount = category.liveEventCount ?? category.eventCount;
          const health = getEventCountHealth(eventCount);
          const margin = getMarginIndicator(category.marginQuality);

          return (
            <Card
              key={category.id}
              className={cn(
                "group cursor-pointer border-admin-border bg-admin-card shadow-sm transition-all hover:border-admin-accent/30",
                isSelected && "border-admin-accent/50 bg-admin-accent/[0.04]",
              )}
              onClick={() => toggleSelect(category.sportKey)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(category.sportKey);
                      }}
                      className="flex size-7 shrink-0 items-center justify-center rounded border border-admin-border bg-admin-surface/70"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelect(category.sportKey);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="size-3.5 rounded border-admin-border bg-admin-surface accent-admin-accent"
                      />
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xl" aria-hidden="true">
                          {category.icon}
                        </span>
                        <p className="truncate text-sm font-bold text-admin-text-primary">
                          {category.displayName}
                        </p>
                      </div>
                      <p className="text-[10px] text-admin-text-muted">
                        Key: {category.sportKey}
                      </p>
                    </div>
                  </div>

                  <div className="ml-auto flex items-start gap-2">
                    <div className="text-right">
                      <p className="font-mono text-xs font-bold text-admin-text-primary">
                        {(eventCount ?? 0).toLocaleString()}
                      </p>
                      <p className="text-[9px] uppercase tracking-tighter text-admin-text-muted">
                        Events
                      </p>
                      <p className="text-[10px] text-admin-text-muted">
                        {formatSyncTime(category.lastSyncedAt)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleToggle(category);
                      }}
                      disabled={isTogglingThis}
                      className="shrink-0"
                    >
                      <Badge
                        className={cn(
                          "cursor-pointer text-[9px] font-bold uppercase tracking-wide transition",
                          category.isActive
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                            : "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20",
                        )}
                      >
                        {isTogglingThis ? (
                          <Loader2 className="mr-0.5 size-2.5 animate-spin" />
                        ) : null}
                        {category.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </button>
                  </div>
                </div>

                {/* Stats row */}
                <div className="mt-2.5 flex items-center gap-3 border-t border-admin-border/50 pt-2">
                  {/* Event count with health indicator */}
                  <div className="flex items-center gap-1 text-[10px] text-admin-text-muted">
                    <Zap size={10} className="text-admin-accent" />
                    <span>
                      <span className={cn("font-bold", health.color)}>
                        {(eventCount ?? 0).toLocaleString()}
                      </span>{" "}
                      events
                    </span>
                  </div>

                  {/* Health indicator */}
                  {category.isActive && (
                    <div className="flex items-center gap-1 text-[10px]">
                      {eventCount === 0 ? (
                        <AlertTriangle size={10} className="text-amber-400" />
                      ) : (
                        <Shield size={10} className={health.color} />
                      )}
                      <span className={health.color}>{health.label}</span>
                    </div>
                  )}

                  <div className="ml-auto text-[10px] text-admin-text-muted">
                    {formatSyncTime(category.lastSyncedAt)}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                  <Badge
                    className={cn(
                      "border px-2 py-0.5",
                      category.oddsAvailable
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-red-500/30 bg-red-500/10 text-red-400",
                    )}
                  >
                    {category.oddsAvailable ? "Odds available" : "No odds"}
                  </Badge>
                  <span className={margin.color}>{margin.label}</span>
                  {typeof category.averageBookmakerMargin === "number" && category.averageBookmakerMargin > 0 ? (
                    <span className="text-admin-text-muted">
                      Margin {(category.averageBookmakerMargin * 100).toFixed(1)}%
                    </span>
                  ) : null}
                  {category.warning ? (
                    <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400">
                      WARNING
                    </Badge>
                  ) : null}
                </div>

                {/* Event count health bar */}
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-admin-surface/60">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      eventCount === 0
                        ? "bg-red-500/60"
                        : eventCount < 5
                          ? "bg-amber-500/60"
                          : "bg-emerald-500/60",
                    )}
                    style={{
                      width: `${Math.min(100, (eventCount / 50) * 100)}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
