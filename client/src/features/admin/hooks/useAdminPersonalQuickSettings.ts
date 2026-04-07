import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  type AdminPersonalQuickSettings,
  defaultAdminPersonalQuickSettings,
  sanitizePersonalQuickSettings,
} from "../config/personalQuickSettings";

const storagePrefix = "betwise-admin-quick-settings";

function getStorageKey(userId: string) {
  return `${storagePrefix}:${userId}`;
}

export function useAdminPersonalQuickSettings() {
  const { user } = useAuth();
  const [settings, setSettingsState] = useState<AdminPersonalQuickSettings>(
    defaultAdminPersonalQuickSettings,
  );

  const storageKey = useMemo(
    () => (user?.id ? getStorageKey(user.id) : null),
    [user?.id],
  );

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      setSettingsState(defaultAdminPersonalQuickSettings);
      return;
    }

    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      setSettingsState(defaultAdminPersonalQuickSettings);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      setSettingsState(sanitizePersonalQuickSettings(parsed));
    } catch {
      setSettingsState(defaultAdminPersonalQuickSettings);
    }
  }, [storageKey]);

  const setSettings = useCallback(
    (
      next:
        | AdminPersonalQuickSettings
        | ((current: AdminPersonalQuickSettings) => AdminPersonalQuickSettings),
    ) => {
      setSettingsState((current) => {
        const resolved =
          typeof next === "function"
            ? (
                next as (
                  value: AdminPersonalQuickSettings,
                ) => AdminPersonalQuickSettings
              )(current)
            : next;

        const sanitized = sanitizePersonalQuickSettings(resolved);

        if (storageKey && typeof window !== "undefined") {
          window.localStorage.setItem(storageKey, JSON.stringify(sanitized));
        }

        return sanitized;
      });
    },
    [storageKey],
  );

  const resetSettings = useCallback(() => {
    setSettings(defaultAdminPersonalQuickSettings);
  }, [setSettings]);

  return {
    settings,
    setSettings,
    resetSettings,
  };
}
