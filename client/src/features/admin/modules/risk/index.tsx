import type { CSSProperties } from "react";
import { useState } from "react";
import { AlertTriangle, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { exposureLimits, riskAlerts, riskControls } from "../../data/mock-data";
import {
  AdminButton,
  AdminCard,
  AdminCardHeader,
  AdminSectionHeader,
  StatusBadge,
  adminToneTextClass,
} from "../../components/ui";

export default function Risk() {
  const [selectedAlert, setSelectedAlert] = useState<
    (typeof riskAlerts)[0] | null
  >(null);
  const [selectedControl, setSelectedControl] = useState<
    (typeof riskControls)[0] | null
  >(null);
  const [editValue, setEditValue] = useState("");

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Risk Management"
        subtitle="Fraud detection, AML, and exposure monitoring"
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminCard>
          <AdminCardHeader
            title="Active Alerts"
            subtitle={`${riskAlerts.length} alerts requiring attention`}
          />
          <div className="mt-4 space-y-3">
            {riskAlerts.map((alert) => {
              const tone =
                alert.type === "high"
                  ? "red"
                  : alert.type === "medium"
                    ? "gold"
                    : "blue";

              return (
                <Dialog key={alert.id}>
                  <DialogTrigger asChild>
                    <div
                      className="flex gap-3 rounded-xl border-l-[3px] bg-admin-surface p-3 cursor-pointer hover:bg-admin-surface/80 transition"
                      onClick={() => setSelectedAlert(alert)}
                      style={{ borderLeftColor: `var(--admin-${tone})` }}
                    >
                      <AlertTriangle
                        className={`mt-0.5 shrink-0 ${adminToneTextClass(tone)}`}
                        size={14}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-admin-text-primary">
                          {alert.message}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-admin-text-muted">
                          <span>{alert.user}</span>
                          <span>-</span>
                          <span>{alert.time}</span>
                        </div>
                      </div>
                      <StatusBadge status={alert.type} />
                    </div>
                  </DialogTrigger>
                  <DialogContent className="border-admin-border bg-admin-card">
                    <DialogHeader>
                      <DialogTitle>Alert Details</DialogTitle>
                      <DialogDescription>
                        Investigate and resolve this security alert
                      </DialogDescription>
                    </DialogHeader>
                    {selectedAlert && (
                      <ScrollArea className="h-[300px] w-full pr-4">
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs text-admin-text-muted">
                              TYPE
                            </p>
                            <p className="mt-1 font-semibold capitalize text-admin-text-primary">
                              {selectedAlert.type} Risk
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-admin-text-muted">
                              MESSAGE
                            </p>
                            <p className="mt-1 text-sm text-admin-text-primary">
                              {selectedAlert.message}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-admin-text-muted">
                              USER
                            </p>
                            <p className="mt-1 font-semibold text-admin-blue">
                              {selectedAlert.user}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-admin-text-muted">
                              TIME
                            </p>
                            <p className="mt-1 text-sm text-admin-text-primary">
                              {selectedAlert.time}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-admin-text-muted">
                              ACTION REQUIRED
                            </p>
                            <p className="mt-1 text-sm text-admin-text-primary">
                              Review account activity and verify user identity.
                              Consider temporary account suspension if risk is
                              confirmed.
                            </p>
                          </div>
                        </div>
                      </ScrollArea>
                    )}
                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" className="flex-1">
                        Dismiss
                      </Button>
                      <Button className="flex-1 bg-admin-accent text-black hover:bg-[#00d492]">
                        Take Action
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              );
            })}
          </div>
        </AdminCard>

        <div className="space-y-4">
          <AdminCard>
            <AdminCardHeader title="Event Exposure Limits" />
            <div className="mt-4 space-y-3">
              {exposureLimits.map((limit) => (
                <div className="space-y-1.5" key={limit.event}>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm text-admin-text-secondary">
                      {limit.event}
                    </span>
                    <span
                      className={`font-semibold ${adminToneTextClass(limit.tone)}`}
                    >
                      ${limit.used}k / ${limit.limit}k
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-admin-surface">
                    <span
                      className="block h-full rounded-full"
                      style={
                        {
                          width: `${Math.min(
                            (limit.used / limit.limit) * 100,
                            100,
                          )}%`,
                          backgroundColor: `var(--admin-${limit.tone})`,
                        } as CSSProperties
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminCard>
            <AdminCardHeader title="Risk Controls" />
            <div className="mt-4 space-y-3">
              {riskControls.map((control) => (
                <div
                  className="flex items-center justify-between gap-3 border-b border-admin-border py-2 last:border-b-0"
                  key={control.label}
                >
                  <span className="text-sm text-admin-text-secondary">
                    {control.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-admin-text-primary">
                      {control.value}
                    </span>
                    <Dialog>
                      <DialogTrigger asChild>
                        <AdminButton
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedControl(control);
                            setEditValue(control.value);
                          }}
                        >
                          <Edit size={10} />
                        </AdminButton>
                      </DialogTrigger>
                      <DialogContent className="border-admin-border bg-admin-card">
                        <DialogHeader>
                          <DialogTitle>Edit Risk Control</DialogTitle>
                          <DialogDescription>
                            Update risk management settings
                          </DialogDescription>
                        </DialogHeader>
                        {selectedControl && (
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm font-semibold text-admin-text-primary">
                                {selectedControl.label}
                              </p>
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                placeholder="Enter new value"
                                className="mt-2 border-admin-border bg-admin-surface text-admin-text-primary"
                              />
                              <p className="mt-2 text-xs text-admin-text-muted">
                                Current: {selectedControl.value}
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 pt-4">
                          <Button variant="outline" className="flex-1">
                            Cancel
                          </Button>
                          <Button className="flex-1 bg-admin-accent text-black hover:bg-[#00d492]">
                            Save
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
