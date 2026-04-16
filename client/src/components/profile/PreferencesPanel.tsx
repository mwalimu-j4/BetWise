import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { api } from "@/api/axiosConfig";
import {
  profileQueryKey,
  type ProfileData,
  type ProfilePreferences,
} from "@/hooks/useProfile";

type PreferencesPanelProps = {
  preferences: ProfilePreferences;
};

export default function PreferencesPanel({
  preferences,
}: PreferencesPanelProps) {
  const queryClient = useQueryClient();
  const [theme, setTheme] = useState<"dark" | "light">(preferences.theme);
  const [dataSaver, setDataSaver] = useState(preferences.dataSaver);

  const mutation = useMutation({
    mutationFn: async (payload: {
      theme?: "dark" | "light";
      dataSaver?: boolean;
    }) => {
      await api.post("/profile/preferences", payload);
      return payload;
    },
    onSuccess: (payload) => {
      queryClient.setQueryData<ProfileData | undefined>(
        profileQueryKey,
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            preferences: {
              ...current.preferences,
              ...payload,
            },
          };
        },
      );
    },
    onError: () => {
      toast.error("Unable to update preferences right now.");
    },
  });

  const updateTheme = (checked: boolean) => {
    const nextTheme = checked ? "dark" : "light";
    setTheme(nextTheme);
    void mutation.mutateAsync({ theme: nextTheme });
  };

  const updateDataSaver = (checked: boolean) => {
    setDataSaver(checked);
    void mutation.mutateAsync({ dataSaver: checked });
  };

  return (
    <section className="rounded-2xl border border-[#31455f] bg-[#0f172a] p-4">
      <h3 className="text-sm font-semibold text-white">Preferences</h3>

      <div className="mt-3 space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-[#31455f] bg-[#0f172a] p-3">
          <div>
            <p className="text-sm font-medium text-white">Display Theme</p>
            <p className="text-xs text-[#8a9bb0]">
              Dark mode optimized for betting screens
            </p>
          </div>
          <Switch
            checked={theme === "dark"}
            onCheckedChange={updateTheme}
            className="data-[state=checked]:bg-[#f5c518]"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-[#31455f] bg-[#0f172a] p-3">
          <div>
            <p className="text-sm font-medium text-white">Data Saver</p>
            <p className="text-xs text-[#8a9bb0]">
              Reduce image and ticker refresh frequency
            </p>
          </div>
          <Switch
            checked={dataSaver}
            onCheckedChange={updateDataSaver}
            className="data-[state=checked]:bg-[#f5c518]"
          />
        </div>
      </div>
    </section>
  );
}
