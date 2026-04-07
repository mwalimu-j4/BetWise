export const adminWithdrawalToneOptions = [
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

export type AdminPersonalQuickSettings = {
  withdrawalSoundEnabled: boolean;
  withdrawalSoundTone: string;
  withdrawalSoundVolume: number;
  playSoundOnlyWhenPageVisible: boolean;
};

export const defaultAdminPersonalQuickSettings: AdminPersonalQuickSettings = {
  withdrawalSoundEnabled: true,
  withdrawalSoundTone: adminWithdrawalToneOptions[0].value,
  withdrawalSoundVolume: 80,
  playSoundOnlyWhenPageVisible: false,
};

export function clampQuickSettingVolume(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function sanitizePersonalQuickSettings(
  value: unknown,
): AdminPersonalQuickSettings {
  if (!value || typeof value !== "object") {
    return defaultAdminPersonalQuickSettings;
  }

  const source = value as Partial<AdminPersonalQuickSettings>;
  const toneExists = adminWithdrawalToneOptions.some(
    (option) => option.value === source.withdrawalSoundTone,
  );

  return {
    withdrawalSoundEnabled:
      typeof source.withdrawalSoundEnabled === "boolean"
        ? source.withdrawalSoundEnabled
        : defaultAdminPersonalQuickSettings.withdrawalSoundEnabled,
    withdrawalSoundTone: toneExists
      ? (source.withdrawalSoundTone as string)
      : defaultAdminPersonalQuickSettings.withdrawalSoundTone,
    withdrawalSoundVolume:
      typeof source.withdrawalSoundVolume === "number"
        ? clampQuickSettingVolume(source.withdrawalSoundVolume)
        : defaultAdminPersonalQuickSettings.withdrawalSoundVolume,
    playSoundOnlyWhenPageVisible:
      typeof source.playSoundOnlyWhenPageVisible === "boolean"
        ? source.playSoundOnlyWhenPageVisible
        : defaultAdminPersonalQuickSettings.playSoundOnlyWhenPageVisible,
  };
}
