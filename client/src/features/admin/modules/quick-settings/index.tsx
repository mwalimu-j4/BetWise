import { useMemo, useState } from "react";
import {
  BellRing,
  CircleAlert,
  Lock,
  Monitor,
  RotateCcw,
  Settings2,
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
  adminWithdrawalToneOptions,
  clampQuickSettingVolume,
} from "../../config/personalQuickSettings";
import { useAdminPersonalQuickSettings } from "../../hooks/useAdminPersonalQuickSettings";

export default function AdminQuickSettings() {
  const { settings, setSettings, resetSettings } =
    useAdminPersonalQuickSettings();
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const summary = useMemo(
    () => ({
      soundStatus: settings.withdrawalSoundEnabled ? "Enabled" : "Muted",
      volume: `${clampQuickSettingVolume(settings.withdrawalSoundVolume)}%`,
      visibilityRule: settings.playSoundOnlyWhenPageVisible
        ? "Only while this tab is visible"
        : "Even when this tab is in the background",
    }),
    [
      settings.playSoundOnlyWhenPageVisible,
      settings.withdrawalSoundEnabled,
      settings.withdrawalSoundVolume,
    ],
  );

  const previewTone = async () => {
    if (isPlayingPreview) {
      return;
    }

    const audio = new Audio(settings.withdrawalSoundTone);
    audio.volume =
      clampQuickSettingVolume(settings.withdrawalSoundVolume) / 100;

    setIsPlayingPreview(true);

    try {
      await audio.play();
    } catch {
      toast.error(
        "Could not play sound preview. Interact with the page and try again.",
      );
    } finally {
      window.setTimeout(() => {
        setIsPlayingPreview(false);
      }, 600);
    }
  };

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Quick Settings"
        subtitle="Personal admin preferences for notifications and workflow comfort"
        actions={
          <Button onClick={resetSettings} variant="outline" className="gap-2">
            <RotateCcw size={14} />
            Reset Personal Defaults
          </Button>
        }
      />

      <AdminCard className="border-admin-border/80 bg-[linear-gradient(120deg,rgba(22,38,72,0.8),rgba(14,24,46,0.86))]">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-admin-border/70 bg-admin-surface/35 p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-admin-text-muted">
              Sound Status
            </p>
            <p className="mt-1 text-lg font-semibold text-admin-text-primary">
              {summary.soundStatus}
            </p>
          </div>
          <div className="rounded-xl border border-admin-border/70 bg-admin-surface/35 p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-admin-text-muted">
              Volume
            </p>
            <p className="mt-1 text-lg font-semibold text-admin-text-primary">
              {summary.volume}
            </p>
          </div>
          <div className="rounded-xl border border-admin-border/70 bg-admin-surface/35 p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-admin-text-muted">
              Visibility Rule
            </p>
            <p className="mt-1 text-sm font-medium text-admin-text-primary">
              {summary.visibilityRule}
            </p>
          </div>
        </div>
      </AdminCard>

      <AdminCard className="border-admin-border/80 bg-admin-card/95">
        <AdminCardHeader
          title="Withdrawal Request Sound"
          subtitle="These preferences are personal to your admin account on this device"
        />

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-admin-border bg-admin-surface/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-admin-text-primary">
                  Enable admin sound alert
                </p>
                <p className="text-xs text-admin-text-muted">
                  Plays when a new withdrawal request notification is received
                  for you.
                </p>
              </div>
              <Switch
                checked={settings.withdrawalSoundEnabled}
                onCheckedChange={(checked) =>
                  setSettings((current) => ({
                    ...current,
                    withdrawalSoundEnabled: checked,
                  }))
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
              value={settings.withdrawalSoundTone}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  withdrawalSoundTone: event.target.value,
                }))
              }
            >
              {adminWithdrawalToneOptions.map((tone) => (
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
                  Alert volume:{" "}
                  {clampQuickSettingVolume(settings.withdrawalSoundVolume)}%
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
              value={clampQuickSettingVolume(settings.withdrawalSoundVolume)}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  withdrawalSoundVolume: clampQuickSettingVolume(
                    Number(event.target.value),
                  ),
                }))
              }
            />
          </div>
        </div>
      </AdminCard>

      <AdminCard className="border-admin-border/80 bg-admin-card/95">
        <AdminCardHeader
          title="Personal Behavior"
          subtitle="How this admin panel behaves for you only"
        />

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-admin-border bg-admin-surface/40 p-4">
            <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-admin-gold/10 text-admin-gold">
              <Monitor size={15} />
            </div>
            <p className="text-sm font-semibold text-admin-text-primary">
              Play sound only when this tab is visible
            </p>
            <p className="mt-1 text-xs text-admin-text-muted">
              Avoid background noise while you work in other apps or tabs.
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-admin-text-secondary">
                {settings.playSoundOnlyWhenPageVisible ? "Enabled" : "Disabled"}
              </span>
              <Switch
                checked={settings.playSoundOnlyWhenPageVisible}
                onCheckedChange={(checked) =>
                  setSettings((current) => ({
                    ...current,
                    playSoundOnlyWhenPageVisible: checked,
                  }))
                }
              />
            </div>
          </div>

          <div className="rounded-xl border border-admin-border bg-admin-surface/40 p-4">
            <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-admin-accent/10 text-admin-accent">
              <Settings2 size={15} />
            </div>
            <p className="text-sm font-semibold text-admin-text-primary">
              Auto-save personal quick settings
            </p>
            <p className="mt-1 text-xs text-admin-text-muted">
              Changes here are saved instantly for your admin profile on this
              device.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-admin-live-dim px-3 py-1 text-xs font-semibold text-admin-live">
              <Lock size={12} />
              Personal only
            </div>
          </div>
        </div>
      </AdminCard>

      <div className="rounded-xl border border-admin-border bg-admin-surface/20 px-4 py-3 text-xs text-admin-text-muted">
        <span className="inline-flex items-center gap-1.5 font-medium text-admin-text-secondary">
          <CircleAlert size={13} />
          Scope:
        </span>{" "}
        these preferences do not change platform-wide system settings for other
        admins.
      </div>
    </div>
  );
}
