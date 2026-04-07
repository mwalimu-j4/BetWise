import { useState, useMemo } from "react";
import { AlertCircle, Eye, Loader, TrendingUp, Filter } from "lucide-react";
import { toast } from "sonner";
import {
  useAdminRiskAlerts,
  useAdminRiskSummary,
  useUpdateRiskAlert,
  type RiskAlert,
} from "../../hooks/useAdminRisk";
import {
  AdminButton,
  AdminCard,
  AdminDialogContent,
  AdminStatCard,
  AdminSectionHeader,
  InlinePill,
  TableShell,
  adminSelectContentClassName,
  adminSelectTriggerClassName,
  adminCompactActionsClassName,
  adminTableCellClassName,
  adminTableClassName,
  adminTableHeadCellClassName,
  truncateEmailForTable,
} from "../../components/ui";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-500/10 text-red-600",
  HIGH: "bg-orange-500/10 text-orange-600",
  MEDIUM: "bg-yellow-500/10 text-yellow-600",
  LOW: "bg-blue-500/10 text-blue-600",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-red-500/10 text-red-600",
  IN_REVIEW: "bg-yellow-500/10 text-yellow-600",
  ESCALATED: "bg-red-600/10 text-red-700",
  RESOLVED: "bg-green-500/10 text-green-600",
  DISMISSED: "bg-gray-500/10 text-gray-600",
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  HIGH_RISK_BET: "High Risk Bet",
  EXPOSURE_LIMIT_EXCEEDED: "Exposure Limit Exceeded",
  SUSPICIOUS_PATTERN: "Suspicious Pattern",
  RAPID_ACCOUNT_ACTIVITY: "Rapid Activity",
  UNUSUAL_ODDS_MOVEMENT: "Unusual Odds Movement",
  SELF_EXCLUSION_BREACH: "Self-Exclusion Breach",
  DUPLICATE_ACCOUNT: "Duplicate Account",
  FRAUD_INDICATOR: "Fraud Indicator",
  BLACKLIST_MATCH: "Blacklist Match",
  CUSTOM_RULE_VIOLATION: "Rule Violation",
};

export default function Risk() {
  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const itemsPerPage = 20;

  // Fetch data
  const { data: alertsData, isLoading: isAlertsLoading } = useAdminRiskAlerts(
    currentPage,
    itemsPerPage,
    statusFilter === "all" ? undefined : statusFilter,
    severityFilter === "all" ? undefined : severityFilter,
    typeFilter === "all" ? undefined : typeFilter,
  );

  const { data: summaryData, isLoading: isSummaryLoading } =
    useAdminRiskSummary();

  const { mutate: updateAlert, isPending: isUpdating } = useUpdateRiskAlert();

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!summaryData?.summary) {
      return [
        { label: "Open Alerts", value: "0", tone: "red" as const },
        { label: "In Review", value: "0", tone: "gold" as const },
        { label: "Critical", value: "0", tone: "red" as const },
        { label: "High Risk Users", value: "0", tone: "purple" as const },
      ];
    }

    const { byStatus, bySeverity } = summaryData.summary;
    return [
      {
        label: "Open Alerts",
        value: byStatus.open.toString(),
        tone: "red" as const,
      },
      {
        label: "In Review",
        value: byStatus.inReview.toString(),
        tone: "gold" as const,
      },
      {
        label: "Critical",
        value: bySeverity.critical.toString(),
        tone: "red" as const,
      },
      {
        label: "High Risk Users",
        value: summaryData.highRiskUsers.length.toString(),
        tone: "purple" as const,
      },
    ];
  }, [summaryData]);

  const alerts = alertsData?.alerts ?? [];
  const pagination = alertsData?.pagination ?? {
    total: 0,
    limit: itemsPerPage,
    offset: 0,
    pages: 1,
    page: 1,
  };

  const handleStatusUpdate = (
    alertId: string,
    newStatus: string,
    action: string,
  ) => {
    updateAlert(
      {
        alertId,
        status: newStatus,
        actionTaken: action,
        resolvedBy: "Admin",
      },
      {
        onSuccess: () => {
          toast.success(`Alert ${newStatus.toLowerCase()}`);
          setDetailsOpen(false);
          setSelectedAlert(null);
        },
        onError: (error: any) => {
          toast.error(
            error?.response?.data?.message || "Failed to update alert",
          );
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Risk Management"
        subtitle="Fraud detection, AML, and exposure monitoring"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
        {isSummaryLoading ? (
          <div className="col-span-full flex items-center justify-center py-8">
            <Loader className="h-6 w-6 animate-spin text-admin-accent" />
          </div>
        ) : (
          stats.map((metric) => (
            <AdminStatCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              tone={metric.tone}
              helper="Severity and queue state synced from the compliance monitor"
            />
          ))
        )}
      </div>

      {/* Filters and Actions */}
      <AdminCard>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-admin-text-muted" />
              <h3 className="font-medium text-admin-text">Filters</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm text-admin-text-muted">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className={adminSelectTriggerClassName}>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className={adminSelectContentClassName}>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_REVIEW">In Review</SelectItem>
                  <SelectItem value="ESCALATED">Escalated</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="DISMISSED">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Severity Filter */}
            <div className="space-y-2">
              <label className="text-sm text-admin-text-muted">Severity</label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className={adminSelectTriggerClassName}>
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent className={adminSelectContentClassName}>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Alert Type Filter */}
            <div className="space-y-2">
              <label className="text-sm text-admin-text-muted">
                Alert Type
              </label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className={adminSelectTriggerClassName}>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className={adminSelectContentClassName}>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="HIGH_RISK_BET">High Risk Bet</SelectItem>
                  <SelectItem value="EXPOSURE_LIMIT_EXCEEDED">
                    Exposure Limit Exceeded
                  </SelectItem>
                  <SelectItem value="SUSPICIOUS_PATTERN">
                    Suspicious Pattern
                  </SelectItem>
                  <SelectItem value="RAPID_ACCOUNT_ACTIVITY">
                    Rapid Activity
                  </SelectItem>
                  <SelectItem value="UNUSUAL_ODDS_MOVEMENT">
                    Unusual Odds Movement
                  </SelectItem>
                  <SelectItem value="SELF_EXCLUSION_BREACH">
                    Self-Exclusion Breach
                  </SelectItem>
                  <SelectItem value="DUPLICATE_ACCOUNT">
                    Duplicate Account
                  </SelectItem>
                  <SelectItem value="FRAUD_INDICATOR">
                    Fraud Indicator
                  </SelectItem>
                  <SelectItem value="BLACKLIST_MATCH">
                    Blacklist Match
                  </SelectItem>
                  <SelectItem value="CUSTOM_RULE_VIOLATION">
                    Rule Violation
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clear Filters */}
          {(statusFilter !== "all" ||
            severityFilter !== "all" ||
            typeFilter !== "all") && (
            <div className="flex justify-end">
              <AdminButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter("all");
                  setSeverityFilter("all");
                  setTypeFilter("all");
                  setCurrentPage(1);
                }}
              >
                Clear Filters
              </AdminButton>
            </div>
          )}
        </div>
      </AdminCard>

      {/* Alerts Table */}
      {isAlertsLoading ? (
        <AdminCard className="flex items-center justify-center py-20">
          <Loader className="h-6 w-6 animate-spin text-admin-accent" />
        </AdminCard>
      ) : alerts.length === 0 ? (
        <AdminCard className="flex items-center justify-center rounded-2xl border-2 border-dashed border-admin-border/50 bg-gradient-to-br from-admin-surface/40 to-admin-surface/20 px-6 py-20 text-center">
          <div className="space-y-4">
            <AlertCircle className="mx-auto h-12 w-12 text-admin-text-muted/50" />
            <p className="text-admin-text-muted">
              {statusFilter !== "all" ||
              severityFilter !== "all" ||
              typeFilter !== "all"
                ? "No alerts match your filters"
                : "No risk alerts at this time"}
            </p>
          </div>
        </AdminCard>
      ) : (
        <AdminCard>
          <div className="space-y-4">
            <h3 className="font-medium text-admin-text">
              Risk Alerts ({pagination.total})
            </h3>
            <TableShell>
              <table className={adminTableClassName}>
                <thead>
                  <tr>
                    <th className={adminTableHeadCellClassName}>Type</th>
                    <th className={adminTableHeadCellClassName}>Severity</th>
                    <th className={adminTableHeadCellClassName}>Status</th>
                    <th className={adminTableHeadCellClassName}>User</th>
                    <th className={adminTableHeadCellClassName}>Description</th>
                    <th className={adminTableHeadCellClassName}>Created</th>
                    <th className={adminTableHeadCellClassName}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr key={alert.id}>
                      <td className={adminTableCellClassName}>
                        <InlinePill
                          tone="blue"
                          label={
                            ALERT_TYPE_LABELS[alert.alertType] ||
                            alert.alertType
                          }
                        />
                      </td>
                      <td className={adminTableCellClassName}>
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${SEVERITY_COLORS[alert.severity]}`}
                        >
                          {alert.severity}
                        </span>
                      </td>
                      <td className={adminTableCellClassName}>
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[alert.status]}`}
                        >
                          {alert.status}
                        </span>
                      </td>
                      <td className={adminTableCellClassName}>
                        {alert.user ? (
                          <div className="space-y-1">
                            <p className="text-sm font-medium">
                              {alert.user.fullName || "N/A"}
                            </p>
                            <p
                              className="max-w-[120px] truncate text-xs text-admin-text-muted"
                              title={alert.user.email}
                            >
                              {truncateEmailForTable(alert.user.email)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-admin-text-muted">N/A</span>
                        )}
                      </td>
                      <td className={adminTableCellClassName}>
                        <p className="line-clamp-2 text-sm">
                          {alert.description}
                        </p>
                      </td>
                      <td className={adminTableCellClassName}>
                        <p className="text-sm text-admin-text-muted">
                          {new Date(alert.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className={adminTableCellClassName}>
                        <Dialog
                          open={detailsOpen}
                          onOpenChange={setDetailsOpen}
                        >
                          <DialogTrigger asChild>
                            <AdminButton
                              variant="ghost"
                              size="sm"
                              className={adminCompactActionsClassName}
                              onClick={() => setSelectedAlert(alert)}
                            >
                              <Eye className="h-4 w-4" />
                            </AdminButton>
                          </DialogTrigger>
                          {selectedAlert?.id === alert.id && (
                            <AdminDialogContent className="max-h-screen max-w-2xl overflow-hidden">
                              <DialogHeader>
                                <DialogTitle>Risk Alert Details</DialogTitle>
                                <DialogDescription>
                                  {ALERT_TYPE_LABELS[selectedAlert.alertType]}
                                </DialogDescription>
                              </DialogHeader>
                              <ScrollArea className="max-h-[60vh]">
                                <div className="space-y-6 pr-4">
                                  {/* Alert Overview */}
                                  <div className="space-y-4">
                                    <h4 className="font-semibold text-admin-text">
                                      Overview
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <p className="text-xs text-admin-text-muted">
                                          Alert Type
                                        </p>
                                        <p className="text-sm font-medium text-admin-text">
                                          {ALERT_TYPE_LABELS[
                                            selectedAlert.alertType
                                          ] || selectedAlert.alertType}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-admin-text-muted">
                                          Severity
                                        </p>
                                        <p
                                          className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${SEVERITY_COLORS[selectedAlert.severity]}`}
                                        >
                                          {selectedAlert.severity}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-admin-text-muted">
                                          Status
                                        </p>
                                        <p
                                          className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[selectedAlert.status]}`}
                                        >
                                          {selectedAlert.status}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-admin-text-muted">
                                          Created
                                        </p>
                                        <p className="text-sm font-medium text-admin-text">
                                          {new Date(
                                            selectedAlert.createdAt,
                                          ).toLocaleString()}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Description */}
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-admin-text">
                                      Description
                                    </h4>
                                    <p className="text-sm text-admin-text-muted">
                                      {selectedAlert.description}
                                    </p>
                                  </div>

                                  {/* User Information */}
                                  {selectedAlert.user && (
                                    <div className="space-y-2">
                                      <h4 className="font-semibold text-admin-text">
                                        User Information
                                      </h4>
                                      <div className="space-y-3 rounded-lg bg-admin-surface/50 p-3">
                                        <div>
                                          <p className="text-xs text-admin-text-muted">
                                            Name
                                          </p>
                                          <p className="text-sm font-medium text-admin-text">
                                            {selectedAlert.user.fullName ||
                                              "N/A"}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-admin-text-muted">
                                            Email
                                          </p>
                                          <p className="text-sm font-medium text-admin-text">
                                            {selectedAlert.user.email}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-admin-text-muted">
                                            Phone
                                          </p>
                                          <p className="text-sm font-medium text-admin-text">
                                            {selectedAlert.user.phone}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Technical Details */}
                                  {(selectedAlert.triggeredValue ||
                                    selectedAlert.threshold ||
                                    selectedAlert.details) && (
                                    <div className="space-y-2">
                                      <h4 className="font-semibold text-admin-text">
                                        Technical Details
                                      </h4>
                                      <div className="space-y-3 rounded-lg bg-admin-surface/50 p-3">
                                        {selectedAlert.triggeredValue && (
                                          <div>
                                            <p className="text-xs text-admin-text-muted">
                                              Triggered Value
                                            </p>
                                            <p className="text-sm font-medium text-admin-text">
                                              {selectedAlert.triggeredValue}
                                            </p>
                                          </div>
                                        )}
                                        {selectedAlert.threshold && (
                                          <div>
                                            <p className="text-xs text-admin-text-muted">
                                              Threshold
                                            </p>
                                            <p className="text-sm font-medium text-admin-text">
                                              {selectedAlert.threshold}
                                            </p>
                                          </div>
                                        )}
                                        {selectedAlert.details && (
                                          <div>
                                            <p className="text-xs text-admin-text-muted">
                                              Additional Details
                                            </p>
                                            <pre className="mt-1 max-h-40 overflow-auto rounded bg-admin-bg p-2 text-xs text-admin-text-muted">
                                              {JSON.stringify(
                                                selectedAlert.details,
                                                null,
                                                2,
                                              )}
                                            </pre>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Action Taken */}
                                  {selectedAlert.actionTaken && (
                                    <div className="space-y-2">
                                      <h4 className="font-semibold text-admin-text">
                                        Action Taken
                                      </h4>
                                      <p className="text-sm text-admin-text-muted">
                                        {selectedAlert.actionTaken}
                                      </p>
                                    </div>
                                  )}

                                  {/* Admin Actions */}
                                  <div className="space-y-3 border-t border-admin-border pt-4">
                                    <h4 className="font-semibold text-admin-text">
                                      Admin Actions
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {selectedAlert.status !== "RESOLVED" && (
                                        <AdminButton
                                          size="sm"
                                          onClick={() =>
                                            handleStatusUpdate(
                                              selectedAlert.id,
                                              "RESOLVED",
                                              "Alert resolved by admin",
                                            )
                                          }
                                          disabled={isUpdating}
                                        >
                                          {isUpdating ? (
                                            <>
                                              <Loader className="mr-2 h-4 w-4 animate-spin" />
                                              Updating...
                                            </>
                                          ) : (
                                            "Resolve"
                                          )}
                                        </AdminButton>
                                      )}
                                      {selectedAlert.status !== "DISMISSED" && (
                                        <AdminButton
                                          size="sm"
                                          onClick={() =>
                                            handleStatusUpdate(
                                              selectedAlert.id,
                                              "DISMISSED",
                                              "Alert dismissed by admin",
                                            )
                                          }
                                          disabled={isUpdating}
                                        >
                                          Dismiss
                                        </AdminButton>
                                      )}
                                      {selectedAlert.status !== "IN_REVIEW" && (
                                        <AdminButton
                                          size="sm"
                                          onClick={() =>
                                            handleStatusUpdate(
                                              selectedAlert.id,
                                              "IN_REVIEW",
                                              "Alert marked for review",
                                            )
                                          }
                                          disabled={isUpdating}
                                        >
                                          Mark Review
                                        </AdminButton>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </ScrollArea>
                            </AdminDialogContent>
                          )}
                        </Dialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-admin-text-muted">
                  Page {pagination.page} of {pagination.pages}
                </p>
                <div className="flex gap-2">
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </AdminButton>
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setCurrentPage(
                        Math.min(pagination.pages, currentPage + 1),
                      )
                    }
                    disabled={currentPage === pagination.pages}
                  >
                    Next
                  </AdminButton>
                </div>
              </div>
            )}
          </div>
        </AdminCard>
      )}

      {/* High Risk Users Panel */}
      {summaryData?.highRiskUsers && summaryData.highRiskUsers.length > 0 && (
        <AdminCard>
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-medium text-admin-text">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              High Risk Users
            </h3>
            <div className="space-y-2">
              {summaryData.highRiskUsers.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between rounded-lg bg-admin-surface/50 px-4 py-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-admin-text">
                      {user.fullName || "Unknown"}
                    </p>
                    <p className="text-xs text-admin-text-muted">
                      {user.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-orange-600">
                      {user.alertCount} alerts
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AdminCard>
      )}
    </div>
  );
}
