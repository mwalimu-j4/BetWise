import { api } from "@/api/axiosConfig";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  CheckSquare,
  Loader2,
  RefreshCw,
  Settings2,
  Square,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
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
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

  const handleToggle = useCallback(
    async (category: SportCategory) => {
      setToggling(category.id);
      try {
        const { data } = await api.patch<SportCategory>(
          `/admin/sport-categories/${category.id}/toggle`,
        );
        setCategories((prev) =>
          prev.map((c) => (c.id === data.id ? { ...c, isActive: data.isActive } : c)),
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
    },
    [],
  );

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

      // Poll for progress
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
              `${data.totalSports} sports configured | ${data.totalConfigured.toLocaleString()} events loaded`,
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

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadCategories({ background: true });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [loadCategories]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-12 animate-pulse rounded-xl border border-admin-border/60 bg-admin-card" />
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`cat-skel-${i}`}
              className="h-20 animate-pulse rounded-xl border border-admin-border/60 bg-admin-card"
            />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`card-skel-${i}`}
              className="h-36 animate-pulse rounded-xl border border-admin-border/60 bg-admin-card"
            />
          ))}
        </div>
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
      <div className="grid grid-cols-3 gap-2">
        <AdminStatCard
          label="Total Sports"
          value={String(categories.length)}
          tone="blue"
        />
        <AdminStatCard
          label="Active"
          value={String(totalActive)}
          tone="live"
        />
        <AdminStatCard
          label="Inactive"
          value={String(totalInactive)}
          tone="accent"
        />
      </div>

      {/* Summary bar */}
      <Card className="border-admin-border bg-admin-card shadow-sm">
        <CardContent className="flex flex-wrap items-center justify-between gap-2 p-2 sm:p-3">
          <p className="text-xs text-admin-text-muted">
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
        </CardContent>
      </Card>

      {/* Progress bar during configure */}
      {configuring && syncStatus && (
        <Card className="border-admin-accent/30 bg-admin-card shadow-sm">
          <CardContent className="p-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-admin-accent">
                Configuring: {syncStatus.currentSport || "Starting..."}
              </span>
              <span className="tabular-nums text-admin-text-muted">
                {syncStatus.completedSports}/{syncStatus.totalSports} sports ·{" "}
                {syncStatus.totalConfigured.toLocaleString()} events
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-admin-surface">
              <div
                className="h-full rounded-full bg-gradient-to-r from-admin-accent to-amber-400 transition-all duration-500"
                style={{ width: `${syncStatus.progress}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-admin-text-muted">
              {syncStatus.progress}% complete
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sport cards grid */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const isSelected = selectedKeys.has(category.sportKey);
          const isTogglingThis = toggling === category.id;

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
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(category.sportKey);
                      }}
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded border transition",
                        isSelected
                          ? "border-admin-accent bg-admin-accent text-black"
                          : "border-admin-border bg-admin-surface",
                      )}
                    >
                      {isSelected && <CheckCircle2 size={12} />}
                    </button>

                    {/* Icon + name */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg" aria-hidden="true">
                          {category.icon}
                        </span>
                        <h3 className="truncate text-sm font-bold text-admin-text-primary">
                          {category.displayName}
                        </h3>
                      </div>
                      <p className="mt-0.5 text-[10px] text-admin-text-muted">
                        Key: {category.sportKey}
                      </p>
                    </div>
                  </div>

                  {/* Toggle */}
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

                {/* Stats row */}
                <div className="mt-2.5 flex items-center gap-3 border-t border-admin-border/50 pt-2">
                  <div className="flex items-center gap-1 text-[10px] text-admin-text-muted">
                    <Zap size={10} className="text-admin-accent" />
                    <span>
                      <span className="font-bold text-admin-text-primary">
                        {(category.liveEventCount ?? category.eventCount).toLocaleString()}
                      </span>{" "}
                      events
                    </span>
                  </div>
                  <div className="text-[10px] text-admin-text-muted">
                    Synced: {formatSyncTime(category.lastSyncedAt)}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
