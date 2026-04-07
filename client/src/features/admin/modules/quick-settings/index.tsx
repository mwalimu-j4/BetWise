import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  Loader2,
  Save,
  Settings2,
  UserPlus,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AdminCard,
  AdminCardHeader,
  AdminSectionHeader,
} from "../../components/ui";
import {
  type AdminSettingsConfig,
  useAdminSettings,
  useUpdateAdminSettings,
} from "../../hooks/useAdminSettings";

const withdrawalToneOptions = [
  {
    label: "Tone 1 (Soft)",
    value: "/sounds/universfield-new-notification-010-352755.mp3",
  },
  {
    label: "Tone 2 (Bright)",
    value: "/sounds/universfield-new-notification-050-494248.mp3",
  },
  {
    label: "Tone 3 (Sharp)",
    value: "/sounds/universfield-new-notification-056-494256.mp3",
  },
] as const;

function cloneSettings(settings: AdminSettingsConfig) {
  return JSON.parse(JSON.stringify(settings)) as AdminSettingsConfig;
}

function clampVolume(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export default function AdminQuickSettings() {
  const { data, isLoading, isError, error } = useAdminSettings();
  const updateSettings = useUpdateAdminSettings();

  const [draft, setDraft] = useState<AdminSettingsConfig | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  useEffect(() => {
    if (data?.config) {
      setDraft(cloneSettings(data.config));
    }
  }, [data?.config]);

  const hasChanges = useMemo(() => {
    if (!draft || !data?.config) {
      return false;
    }

    return JSON.stringify(draft) !== JSON.stringify(data.config);
  }, [draft, data?.config]);

  const saveQuickSettings = async () => {
    if (!draft) {
      return;
    }

    try {
      const result = await updateSettings.mutateAsync(draft);
      setDraft(cloneSettings(result.config));
      toast.success("Quick settings updated.");
    } catch (mutationError: unknown) {
      const message =
        typeof mutationError === "object" &&
        mutationError !== null &&
        "response" in mutationError &&
        typeof (mutationError as { response?: unknown }).response === "object"
          ? ((mutationError as { response?: { data?: { message?: string } } })
              .response?.data?.message ?? "Failed to update quick settings.")
          : "Failed to update quick settings.";
      toast.error(message);
    }
  };

  const previewTone = async () => {
    if (!draft || isPlayingPreview) {
      return;
    }

    const audio = new Audio(draft.adminQuickSettings.withdrawalSoundTone);
    audio.volume = clampVolume(draft.adminQuickSettings.withdrawalSoundVolume) / 100;

    setIsPlayingPreview(true);

    try {
      await audio.play();
    } catch {
      toast.error("Could not play sound preview. Interact with the page and try again.");
    } finally {
      window.setTimeout(() => {
        setIsPlayingPreview(false);
      }, 600);
    }
  };

  if (isLoading || !draft) {
    return (
      <AdminCard>
        <div className="flex min-h-60 items-center justify-center gap-2 text-admin-text-muted">
          <Loader2 size={18} className="animate-spin" />
          Loading quick settings...
        </div>
      </AdminCard>
    );
  }

  if (isError) {
    return (
      <AdminCard>
        <p className="text-sm font-semibold text-admin-red">
          Failed to load quick settings.
        </p>
        <p className="mt-1 text-sm text-admin-text-muted">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </AdminCard>
    );
  }

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Quick Settings"
        subtitle="Fast admin controls for alerts and common platform toggles"
        actions={
          <Button
            onClick={saveQuickSettings}
            disabled={!hasChanges || updateSettings.isPending}
            className="gap-2"
          >
            {updateSettings.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Save Changes
          </Button>
        }
      />

      <AdminCard className="border-admin-border/80 bg-admin-card/95">
        <AdminCardHeader
          title="Withdrawal Request Sound"
          subtitle="Ring a selected tone whenever a new withdrawal request arrives"
        />

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-admin-border bg-admin-surface/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-admin-text-primary">
                  Enable admin sound alert
                </p>
                <p className="text-xs text-admin-text-muted">
                  Plays when a new withdrawal request notification is received.
                </p>
              </div>
              <Switch
                checked={draft.adminQuickSettings.withdrawalSoundEnabled}
                onCheckedChange={(checked) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          adminQuickSettings: {
                            ...current.adminQuickSettings,
                            withdrawalSoundEnabled: checked,
                          },
                        }
                      : current,
                  )
                }
              />
            </div>
          </div>

          <div className="rounded-xl border border-admin-border bg-admin-surface/40 p-4">
            <p className="text-sm font-semibold text-admin-text-primary">
              Alert tone
            </p>
            <p className="mt-1 text-xs text-admin-text-muted">
              Select the sound played for withdrawal request alerts.
            </p>
            <select
              className="mt-3 h-10 w-full rounded-lg border border-admin-border bg-admin-surface px-3 text-sm text-admin-text-primary outline-none transition focus:border-admin-border-strong"
              value={draft.adminQuickSettings.withdrawalSoundTone}
              onChange={(event) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        adminQuickSettings: {
                          ...current.adminQuickSettings,
                          withdrawalSoundTone: event.target.value,
                        },
                      }
                    : current,
                )
              }
            >
              {withdrawalToneOptions.map((tone) => (
                <option key={tone.value} value={tone.value}>
                  {tone.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-admin-border bg-admin-surface/40 p-4 md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-admin-text-primary">
                  Alert volume: {clampVolume(draft.adminQuickSettings.withdrawalSoundVolume)}%
                </p>
                <p className="text-xs text-admin-text-muted">
                  Controls sound level for admin withdrawal request alerts.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={previewTone}
                disabled={isPlayingPreview}
              >
                <BellRing size={14} />
                {isPlayingPreview ? "Playing..." : "Test Tone"}
              </Button>
            </div>
            <input
              className="mt-3 w-full accent-admin-accent"
              type="range"
              min={0}
              max={100}
              step={1}
              value={clampVolume(draft.adminQuickSettings.withdrawalSoundVolume)}
              onChange={(event) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        adminQuickSettings: {
                          ...current.adminQuickSettings,
                          withdrawalSoundVolume: clampVolume(Number(event.target.value)),
                        },
                      }
                    : current,
                )
              }
            />
          </div>
        </div>
      </AdminCard>

      <AdminCard className="border-admin-border/80 bg-admin-card/95">
        <AdminCardHeader
          title="Other Quick Admin Toggles"
          subtitle="Common controls for day-to-day admin operations"
        />

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-admin-border bg-admin-surface/40 p-4">
            <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-admin-accent/10 text-admin-accent">
              <Wrench size={15} />
            </div>
            <p className="text-sm font-semibold text-admin-text-primary">Maintenance Mode</p>
            <p className="mt-1 text-xs text-admin-text-muted">
              Temporarily limit platform access for maintenance.
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-admin-text-secondary">
                {draft.generalSystemConfig.maintenanceMode ? "Enabled" : "Disabled"}
              </span>
              <Switch
                checked={draft.generalSystemConfig.maintenanceMode}
                onCheckedChange={(checked) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          generalSystemConfig: {
                            ...current.generalSystemConfig,
                            maintenanceMode: checked,
                          },
                        }
                      : current,
                  )
                }
              />
            </div>
          </div>

          <div className="rounded-xl border border-admin-border bg-admin-surface/40 p-4">
            <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-admin-blue/10 text-admin-blue">
              <UserPlus size={15} />
            </div>
            <p className="text-sm font-semibold text-admin-text-primary">User Registration</p>
            <p className="mt-1 text-xs text-admin-text-muted">
              Enable or disable new account signups quickly.
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-admin-text-secondary">
                {draft.generalSystemConfig.registrationEnabled ? "Enabled" : "Disabled"}
              </span>
              <Switch
                checked={draft.generalSystemConfig.registrationEnabled}
                onCheckedChange={(checked) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          generalSystemConfig: {
                            ...current.generalSystemConfig,
                            registrationEnabled: checked,
                          },
                        }
                      : current,
                  )
                }
              />
            </div>
          </div>

          <div className="rounded-xl border border-admin-border bg-admin-surface/40 p-4">
            <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-admin-gold/10 text-admin-gold">
              <Settings2 size={15} />
            </div>
            <p className="text-sm font-semibold text-admin-text-primary">Admin Alerts</p>
            <p className="mt-1 text-xs text-admin-text-muted">
              Toggle operational alerts sent to admin notifications.
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-admin-text-secondary">
                {draft.notificationsConfig.events.adminAlerts ? "Enabled" : "Disabled"}
              </span>
              <Switch
                checked={draft.notificationsConfig.events.adminAlerts}
                onCheckedChange={(checked) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          notificationsConfig: {
                            ...current.notificationsConfig,
                            events: {
                              ...current.notificationsConfig.events,
                              adminAlerts: checked,
                            },
                          },
                        }
                      : current,
                  )
                }
              />
            </div>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
