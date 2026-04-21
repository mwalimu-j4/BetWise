import { api } from "@/api/axiosConfig";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckSquare,
  Loader2,
  RefreshCw,
  Settings2,
  Square,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AdminCard,
  AdminSectionHeader,
  AdminStatCard,
  TableShell,
  adminTableCellClassName,
  adminTableClassName,
  adminTableHeadCellClassName,
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
      <div className="grid grid-cols-3 gap-2">
        <AdminStatCard
          label="Total"
          value={String(categories.length)}
          tone="blue"
        />
        <AdminStatCard label="Active" value={String(totalActive)} tone="live" />
        <AdminStatCard
          label="Inactive"
          value={String(totalInactive)}
          tone="red"
        />
      </div>

      {/* Toolbar */}
      <AdminCard className="px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-admin-text-muted/70">
            <span className="font-bold text-admin-text-primary">
              {categories.length}
            </span>{" "}
            sports ·{" "}
            <span className="font-bold text-admin-accent">{totalActive}</span>{" "}
            active
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
                {syncStatus.totalConfigured.toLocaleString()} events
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

      {/* Sport Categories Table */}
      <AdminCard className="overflow-hidden p-0">
        <TableShell>
          <table className={adminTableClassName}>
            <thead>
              <tr>
                <th
                  className={cn(
                    adminTableHeadCellClassName,
                    "w-10 text-center",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={
                      selectedKeys.size === categories.length &&
                      categories.length > 0
                    }
                    onChange={(e) => {
                      if (e.target.checked) handleSelectAll();
                      else handleDeselectAll();
                    }}
                    className="size-3.5 rounded border-admin-border bg-admin-surface accent-admin-accent"
                  />
                </th>
                <th className={adminTableHeadCellClassName}>Sport</th>
                <th
                  className={cn(
                    adminTableHeadCellClassName,
                    "w-24 text-center",
                  )}
                >
                  Events
                </th>
                <th className={adminTableHeadCellClassName}>Last Synced</th>
                <th
                  className={cn(adminTableHeadCellClassName, "w-32 text-right")}
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {categories.map((category) => {
                const isSelected = selectedKeys.has(category.sportKey);
                const isTogglingThis = toggling === category.id;
                return (
                  <tr
                    key={category.id}
                    className={cn(
                      "group cursor-pointer transition-colors duration-200 hover:bg-white/[0.02]",
                      isSelected && "bg-admin-accent/[0.03]",
                    )}
                    onClick={() => toggleSelect(category.sportKey)}
                  >
                    <td
                      className={cn(
                        adminTableCellClassName,
                        "w-10 text-center",
                      )}
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
                    </td>
                    <td className={adminTableCellClassName}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl" aria-hidden="true">
                          {category.icon}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-admin-text-primary">
                            {category.displayName}
                          </p>
                          <p className="text-[10px] text-admin-text-muted">
                            Key: {category.sportKey}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className={cn(adminTableCellClassName, "text-center")}>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-mono text-xs font-bold text-admin-text-primary">
                          {(
                            category.liveEventCount ?? category.eventCount
                          ).toLocaleString()}
                        </span>
                        <span className="text-[9px] uppercase tracking-tighter text-admin-text-muted">
                          Events
                        </span>
                      </div>
                    </td>
                    <td className={adminTableCellClassName}>
                      <p className="text-xs text-admin-text-muted">
                        {formatSyncTime(category.lastSyncedAt)}
                      </p>
                    </td>
                    <td className={cn(adminTableCellClassName, "text-right")}>
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
                            "cursor-pointer border-transparent text-[9px] font-bold uppercase tracking-wide transition",
                            category.isActive
                              ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                              : "bg-red-500/10 text-red-400 hover:bg-red-500/20",
                          )}
                        >
                          {isTogglingThis ? (
                            <Loader2 className="mr-0.5 size-2.5 animate-spin" />
                          ) : null}
                          {category.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableShell>
      </AdminCard>
    </div>
  );
}
