import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  AdminButton,
  AdminCard,
  AdminCardHeader,
  AdminSectionHeader,
} from "../../components/ui";
import {
  type AdminSettingsConfig,
  useAdminSettings,
  useUpdateAdminSettings,
} from "../../hooks/useAdminSettings";

const inputClassName =
  "h-10 w-full rounded-xl border border-admin-border bg-admin-surface px-3 text-sm text-admin-text-primary outline-none transition focus:border-admin-border-strong";
const textareaClassName =
  "w-full rounded-xl border border-admin-border bg-admin-surface px-3 py-2.5 text-sm text-admin-text-primary outline-none transition focus:border-admin-border-strong";

function cloneSettings(settings: AdminSettingsConfig) {
  return JSON.parse(JSON.stringify(settings)) as AdminSettingsConfig;
}

function parseLineSeparatedArray(value: string) {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-admin-text-muted">
        {label}
      </p>
      {children}
      {hint ? (
        <p className="text-[11px] text-admin-text-muted">{hint}</p>
      ) : null}
    </label>
  );
}

function ToggleField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-admin-border bg-admin-surface/60 px-3 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-admin-text-primary">
            {label}
          </p>
          {hint ? (
            <p className="text-[11px] text-admin-text-muted">{hint}</p>
          ) : null}
        </div>
        <Switch checked={checked} onCheckedChange={onChange} />
      </div>
    </div>
  );
}

export default function Settings() {
  const { data, isLoading, isError, error } = useAdminSettings();
  const updateSettings = useUpdateAdminSettings();

  const [draft, setDraft] = useState<AdminSettingsConfig | null>(null);
  const [activeSection, setActiveSection] = useState("general");

  useEffect(() => {
    if (data?.config) {
      setDraft(cloneSettings(data.config));
    }
  }, [data?.config]);

  const isDirty = useMemo(() => {
    if (!data?.config || !draft) {
      return false;
    }

    return JSON.stringify(data.config) !== JSON.stringify(draft);
  }, [data?.config, draft]);

  const withDraft = (
    updater: (current: AdminSettingsConfig) => AdminSettingsConfig,
  ) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      return updater(current);
    });
  };

  const handleSave = async () => {
    if (!draft) {
      return;
    }

    try {
      await updateSettings.mutateAsync(draft);
      toast.success("Admin settings saved successfully.");
    } catch (mutationError: unknown) {
      const message =
        typeof mutationError === "object" &&
        mutationError !== null &&
        "response" in mutationError &&
        typeof (mutationError as { response?: unknown }).response === "object"
          ? ((mutationError as { response?: { data?: { message?: string } } })
              .response?.data?.message ?? "Failed to save admin settings.")
          : "Failed to save admin settings.";
      toast.error(message);
    }
  };

  const handleReset = () => {
    if (data?.config) {
      setDraft(cloneSettings(data.config));
      toast.success("Unsaved changes were discarded.");
    }
  };

  if (isLoading || !draft) {
    return (
      <AdminCard>
        <div className="flex min-h-[260px] items-center justify-center gap-3 text-admin-text-muted">
          <Loader2 className="animate-spin" size={18} />
          <span>Loading admin settings...</span>
        </div>
      </AdminCard>
    );
  }

  if (isError) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return (
      <AdminCard>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-admin-red">
            Failed to load admin settings
          </p>
          <p className="text-sm text-admin-text-muted">{message}</p>
        </div>
      </AdminCard>
    );
  }

  const sections = [
    { id: "general", label: "General" },
    { id: "users", label: "Users" },
    { id: "kyc", label: "KYC" },
    { id: "payments", label: "Payments" },
    { id: "betting", label: "Betting" },
    { id: "risk", label: "Risk" },
    { id: "bonuses", label: "Bonuses" },
    { id: "notifications", label: "Notifications" },
    { id: "integrations", label: "API" },
    { id: "security", label: "Security" },
    { id: "finance", label: "Tax & Finance" },
    { id: "affiliate", label: "Affiliate" },
    { id: "legal", label: "Legal" },
    { id: "operations", label: "Operations" },
    { id: "audit", label: "Audit" },
    { id: "rg", label: "Responsible Gaming" },
  ];

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Admin Settings"
        subtitle="Complete platform configuration for operations, risk, compliance, and finance."
        actions={
          <>
            <AdminButton
              variant="ghost"
              onClick={handleReset}
              disabled={!isDirty || updateSettings.isPending}
            >
              <RefreshCcw size={13} />
              Reset
            </AdminButton>
            <AdminButton
              onClick={() => void handleSave()}
              disabled={!isDirty || updateSettings.isPending}
            >
              {updateSettings.isPending ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Save size={14} />
              )}
              Save Changes
            </AdminButton>
          </>
        }
      />

      <AdminCard>
        <div className="flex flex-wrap items-center gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] transition ${
                activeSection === section.id
                  ? "border-[var(--color-border-accent)] bg-admin-accent-dim text-admin-accent"
                  : "border-admin-border text-admin-text-secondary hover:border-admin-border-strong hover:text-admin-text-primary"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
        <div className="mt-3 text-xs text-admin-text-muted">
          Last updated{" "}
          {new Date(data?.metadata.updatedAt ?? "").toLocaleString("en-KE")}
        </div>
      </AdminCard>

      <div className="grid gap-4 xl:grid-cols-2">
        {(activeSection === "general" || activeSection === "users") && (
          <>
            <AdminCard>
              <AdminCardHeader title="1. General System Config" />
              <div className="mt-4 grid gap-4">
                <Field label="Platform Name">
                  <input
                    className={inputClassName}
                    value={draft.generalSystemConfig.platformName}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        generalSystemConfig: {
                          ...current.generalSystemConfig,
                          platformName: event.target.value,
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Environment">
                  <select
                    className={inputClassName}
                    value={draft.generalSystemConfig.environment}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        generalSystemConfig: {
                          ...current.generalSystemConfig,
                          environment: event.target.value as "sandbox" | "live",
                        },
                      }))
                    }
                  >
                    <option value="sandbox">Sandbox</option>
                    <option value="live">Live</option>
                  </select>
                </Field>
                <Field label="Default Currency">
                  <input
                    className={inputClassName}
                    value={draft.generalSystemConfig.defaultCurrency}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        generalSystemConfig: {
                          ...current.generalSystemConfig,
                          defaultCurrency: event.target.value.toUpperCase(),
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Timezone">
                  <input
                    className={inputClassName}
                    value={draft.generalSystemConfig.timezone}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        generalSystemConfig: {
                          ...current.generalSystemConfig,
                          timezone: event.target.value,
                        },
                      }))
                    }
                  />
                </Field>
                <ToggleField
                  label="Maintenance Mode"
                  checked={draft.generalSystemConfig.maintenanceMode}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      generalSystemConfig: {
                        ...current.generalSystemConfig,
                        maintenanceMode: checked,
                      },
                    }))
                  }
                />
                <ToggleField
                  label="Registration Enabled"
                  checked={draft.generalSystemConfig.registrationEnabled}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      generalSystemConfig: {
                        ...current.generalSystemConfig,
                        registrationEnabled: checked,
                      },
                    }))
                  }
                />
              </div>
            </AdminCard>

            <AdminCard>
              <AdminCardHeader title="2. User Defaults & Restrictions" />
              <div className="mt-4 grid gap-4">
                {[
                  ["Default Wallet Balance", "defaultWalletBalance"],
                  ["Min Deposit", "minDeposit"],
                  ["Max Deposit", "maxDeposit"],
                  ["Min Withdrawal", "minWithdrawal"],
                  ["Max Withdrawal", "maxWithdrawal"],
                  ["Daily Transaction Limit", "dailyTransactionLimit"],
                  ["Max Active Bets Per User", "maxActiveBetsPerUser"],
                ].map(([label, key]) => (
                  <Field key={key} label={label}>
                    <input
                      className={inputClassName}
                      type="number"
                      value={
                        draft.userDefaultsAndRestrictions[
                          key as keyof AdminSettingsConfig["userDefaultsAndRestrictions"]
                        ] as number
                      }
                      onChange={(event) =>
                        withDraft((current) => ({
                          ...current,
                          userDefaultsAndRestrictions: {
                            ...current.userDefaultsAndRestrictions,
                            [key]: toNumber(event.target.value, 0),
                          },
                        }))
                      }
                    />
                  </Field>
                ))}
                <Field label="Default User Role">
                  <select className={inputClassName} value="USER" disabled>
                    <option value="USER">USER</option>
                  </select>
                </Field>
                <Field label="Auto Verification Rule">
                  <select
                    className={inputClassName}
                    value={
                      draft.userDefaultsAndRestrictions.autoVerificationRule
                    }
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        userDefaultsAndRestrictions: {
                          ...current.userDefaultsAndRestrictions,
                          autoVerificationRule: event.target.value as
                            | "none"
                            | "email"
                            | "email_and_phone",
                        },
                      }))
                    }
                  >
                    <option value="none">None</option>
                    <option value="email">Email Only</option>
                    <option value="email_and_phone">Email + Phone</option>
                  </select>
                </Field>
              </div>
            </AdminCard>
          </>
        )}

        {(activeSection === "kyc" || activeSection === "payments") && (
          <>
            <AdminCard>
              <AdminCardHeader title="3. KYC / Compliance Config" />
              <div className="mt-4 space-y-4">
                <ToggleField
                  label="KYC Required"
                  checked={draft.kycAndComplianceConfig.kycRequired}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      kycAndComplianceConfig: {
                        ...current.kycAndComplianceConfig,
                        kycRequired: checked,
                      },
                    }))
                  }
                />
                <ToggleField
                  label="Require ID Field"
                  checked={draft.kycAndComplianceConfig.requiredFields.id}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      kycAndComplianceConfig: {
                        ...current.kycAndComplianceConfig,
                        requiredFields: {
                          ...current.kycAndComplianceConfig.requiredFields,
                          id: checked,
                        },
                      },
                    }))
                  }
                />
                <ToggleField
                  label="Require Phone Field"
                  checked={draft.kycAndComplianceConfig.requiredFields.phone}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      kycAndComplianceConfig: {
                        ...current.kycAndComplianceConfig,
                        requiredFields: {
                          ...current.kycAndComplianceConfig.requiredFields,
                          phone: checked,
                        },
                      },
                    }))
                  }
                />
                <ToggleField
                  label="Require Email Field"
                  checked={draft.kycAndComplianceConfig.requiredFields.email}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      kycAndComplianceConfig: {
                        ...current.kycAndComplianceConfig,
                        requiredFields: {
                          ...current.kycAndComplianceConfig.requiredFields,
                          email: checked,
                        },
                      },
                    }))
                  }
                />
                <ToggleField
                  label="Withdrawal Requires KYC"
                  checked={draft.kycAndComplianceConfig.withdrawalRequiresKyc}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      kycAndComplianceConfig: {
                        ...current.kycAndComplianceConfig,
                        withdrawalRequiresKyc: checked,
                      },
                    }))
                  }
                />
                <Field label="Minimum Age">
                  <input
                    type="number"
                    className={inputClassName}
                    value={draft.kycAndComplianceConfig.minimumAge}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        kycAndComplianceConfig: {
                          ...current.kycAndComplianceConfig,
                          minimumAge: toNumber(event.target.value, 18),
                        },
                      }))
                    }
                  />
                </Field>
                <Field
                  label="Allowed Countries"
                  hint="ISO country codes separated by comma or newline, e.g. KE, UG, TZ"
                >
                  <textarea
                    className={textareaClassName}
                    rows={3}
                    value={draft.kycAndComplianceConfig.allowedCountries.join(
                      ", ",
                    )}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        kycAndComplianceConfig: {
                          ...current.kycAndComplianceConfig,
                          allowedCountries: parseLineSeparatedArray(
                            event.target.value.toUpperCase(),
                          ),
                        },
                      }))
                    }
                  />
                </Field>
              </div>
            </AdminCard>

            <AdminCard>
              <AdminCardHeader title="4. Payments (M-Pesa / Others)" />
              <div className="mt-4 space-y-4">
                <ToggleField
                  label="Enable M-Pesa"
                  checked={draft.paymentsConfig.methods.mpesa}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      paymentsConfig: {
                        ...current.paymentsConfig,
                        methods: {
                          ...current.paymentsConfig.methods,
                          mpesa: checked,
                        },
                      },
                    }))
                  }
                />
                <ToggleField
                  label="Enable Bank Transfer"
                  checked={draft.paymentsConfig.methods.bankTransfer}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      paymentsConfig: {
                        ...current.paymentsConfig,
                        methods: {
                          ...current.paymentsConfig.methods,
                          bankTransfer: checked,
                        },
                      },
                    }))
                  }
                />
                <ToggleField
                  label="Enable Airtel Money"
                  checked={draft.paymentsConfig.methods.airtelMoney}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      paymentsConfig: {
                        ...current.paymentsConfig,
                        methods: {
                          ...current.paymentsConfig.methods,
                          airtelMoney: checked,
                        },
                      },
                    }))
                  }
                />
                <ToggleField
                  label="Enable Card Payments"
                  checked={draft.paymentsConfig.methods.card}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      paymentsConfig: {
                        ...current.paymentsConfig,
                        methods: {
                          ...current.paymentsConfig.methods,
                          card: checked,
                        },
                      },
                    }))
                  }
                />
                <Field label="M-Pesa Shortcode">
                  <input
                    className={inputClassName}
                    value={draft.paymentsConfig.mpesa.shortcode}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        paymentsConfig: {
                          ...current.paymentsConfig,
                          mpesa: {
                            ...current.paymentsConfig.mpesa,
                            shortcode: event.target.value,
                          },
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="M-Pesa Consumer Key">
                  <input
                    className={inputClassName}
                    value={draft.paymentsConfig.mpesa.consumerKey}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        paymentsConfig: {
                          ...current.paymentsConfig,
                          mpesa: {
                            ...current.paymentsConfig.mpesa,
                            consumerKey: event.target.value,
                          },
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="M-Pesa Consumer Secret">
                  <input
                    className={inputClassName}
                    value={draft.paymentsConfig.mpesa.consumerSecret}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        paymentsConfig: {
                          ...current.paymentsConfig,
                          mpesa: {
                            ...current.paymentsConfig.mpesa,
                            consumerSecret: event.target.value,
                          },
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="M-Pesa Passkey">
                  <input
                    className={inputClassName}
                    value={draft.paymentsConfig.mpesa.passkey}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        paymentsConfig: {
                          ...current.paymentsConfig,
                          mpesa: {
                            ...current.paymentsConfig.mpesa,
                            passkey: event.target.value,
                          },
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="M-Pesa Callback URL">
                  <input
                    className={inputClassName}
                    value={draft.paymentsConfig.mpesa.callbackUrl}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        paymentsConfig: {
                          ...current.paymentsConfig,
                          mpesa: {
                            ...current.paymentsConfig.mpesa,
                            callbackUrl: event.target.value,
                          },
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Transaction Fee (%)">
                  <input
                    type="number"
                    className={inputClassName}
                    value={draft.paymentsConfig.mpesa.transactionFeePercent}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        paymentsConfig: {
                          ...current.paymentsConfig,
                          mpesa: {
                            ...current.paymentsConfig.mpesa,
                            transactionFeePercent: toNumber(
                              event.target.value,
                              0,
                            ),
                          },
                        },
                      }))
                    }
                  />
                </Field>
                <ToggleField
                  label="Auto Withdraw"
                  checked={draft.paymentsConfig.mpesa.autoWithdrawEnabled}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      paymentsConfig: {
                        ...current.paymentsConfig,
                        mpesa: {
                          ...current.paymentsConfig.mpesa,
                          autoWithdrawEnabled: checked,
                        },
                      },
                    }))
                  }
                />
                <Field label="Withdrawal Approval Threshold">
                  <input
                    type="number"
                    className={inputClassName}
                    value={
                      draft.paymentsConfig.mpesa.withdrawalApprovalThreshold
                    }
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        paymentsConfig: {
                          ...current.paymentsConfig,
                          mpesa: {
                            ...current.paymentsConfig.mpesa,
                            withdrawalApprovalThreshold: toNumber(
                              event.target.value,
                              0,
                            ),
                          },
                        },
                      }))
                    }
                  />
                </Field>
              </div>
            </AdminCard>
          </>
        )}

        {(activeSection === "betting" || activeSection === "risk") && (
          <>
            <AdminCard>
              <AdminCardHeader title="5. Betting Engine Config" />
              <div className="mt-4 grid gap-4">
                {[
                  ["Minimum Bet Amount", "minBetAmount"],
                  ["Maximum Bet Amount", "maxBetAmount"],
                  ["Max Win Per Bet", "maxWinPerBet"],
                  ["Odds Margin (%)", "oddsMarginPercent"],
                  ["Bet Delay (ms)", "betDelayMs"],
                  ["Cashout Margin (%)", "cashoutMarginPercent"],
                ].map(([label, key]) => (
                  <Field key={key} label={label}>
                    <input
                      type="number"
                      className={inputClassName}
                      value={
                        draft.bettingEngineConfig[
                          key as keyof AdminSettingsConfig["bettingEngineConfig"]
                        ] as number
                      }
                      onChange={(event) =>
                        withDraft((current) => ({
                          ...current,
                          bettingEngineConfig: {
                            ...current.bettingEngineConfig,
                            [key]: toNumber(event.target.value, 0),
                          },
                        }))
                      }
                    />
                  </Field>
                ))}
                <ToggleField
                  label="Cashout Enabled"
                  checked={draft.bettingEngineConfig.cashoutEnabled}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      bettingEngineConfig: {
                        ...current.bettingEngineConfig,
                        cashoutEnabled: checked,
                      },
                    }))
                  }
                />
                <ToggleField
                  label="Allow Live Betting"
                  checked={draft.bettingEngineConfig.allowLiveBetting}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      bettingEngineConfig: {
                        ...current.bettingEngineConfig,
                        allowLiveBetting: checked,
                      },
                    }))
                  }
                />
              </div>
            </AdminCard>

            <AdminCard>
              <AdminCardHeader title="6. Risk Management Config" />
              <div className="mt-4 grid gap-4">
                {[
                  ["Max Exposure Per Event", "maxExposurePerEvent"],
                  ["Max Exposure Per Market", "maxExposurePerMarket"],
                  ["Max Payout Per Day", "maxPayoutPerDay"],
                  ["High-Risk Bet Threshold", "highRiskBetThreshold"],
                ].map(([label, key]) => (
                  <Field key={key} label={label}>
                    <input
                      type="number"
                      className={inputClassName}
                      value={
                        draft.riskManagementConfig[
                          key as keyof AdminSettingsConfig["riskManagementConfig"]
                        ] as number
                      }
                      onChange={(event) =>
                        withDraft((current) => ({
                          ...current,
                          riskManagementConfig: {
                            ...current.riskManagementConfig,
                            [key]: toNumber(event.target.value, 0),
                          },
                        }))
                      }
                    />
                  </Field>
                ))}
                <ToggleField
                  label="Auto-block Suspicious Users"
                  checked={draft.riskManagementConfig.autoBlockSuspiciousUsers}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      riskManagementConfig: {
                        ...current.riskManagementConfig,
                        autoBlockSuspiciousUsers: checked,
                      },
                    }))
                  }
                />
              </div>
            </AdminCard>
          </>
        )}

        {(activeSection === "bonuses" || activeSection === "notifications") && (
          <>
            <AdminCard>
              <AdminCardHeader title="7. Bonuses & Promotions Config" />
              <div className="mt-4 space-y-4">
                <ToggleField
                  label="Welcome Bonus Enabled"
                  checked={draft.bonusesAndPromotionsConfig.welcomeBonusEnabled}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      bonusesAndPromotionsConfig: {
                        ...current.bonusesAndPromotionsConfig,
                        welcomeBonusEnabled: checked,
                      },
                    }))
                  }
                />
                <Field label="Bonus Mode">
                  <select
                    className={inputClassName}
                    value={draft.bonusesAndPromotionsConfig.bonusMode}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        bonusesAndPromotionsConfig: {
                          ...current.bonusesAndPromotionsConfig,
                          bonusMode: event.target.value as
                            | "fixed_amount"
                            | "percentage",
                        },
                      }))
                    }
                  >
                    <option value="fixed_amount">Fixed Amount</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </Field>
                {[
                  ["Bonus Amount", "bonusAmount"],
                  ["Bonus Percentage", "bonusPercent"],
                  ["Wagering Requirement (x)", "wageringRequirementMultiplier"],
                  ["Bonus Expiry (hours)", "bonusExpiryHours"],
                  ["Max Bonus Per User", "maxBonusPerUser"],
                ].map(([label, key]) => (
                  <Field key={key} label={label}>
                    <input
                      type="number"
                      className={inputClassName}
                      value={
                        draft.bonusesAndPromotionsConfig[
                          key as keyof AdminSettingsConfig["bonusesAndPromotionsConfig"]
                        ] as number
                      }
                      onChange={(event) =>
                        withDraft((current) => ({
                          ...current,
                          bonusesAndPromotionsConfig: {
                            ...current.bonusesAndPromotionsConfig,
                            [key]: toNumber(event.target.value, 0),
                          },
                        }))
                      }
                    />
                  </Field>
                ))}
                <Field label="Cashback Rules">
                  <textarea
                    className={textareaClassName}
                    rows={3}
                    value={draft.bonusesAndPromotionsConfig.cashbackRule}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        bonusesAndPromotionsConfig: {
                          ...current.bonusesAndPromotionsConfig,
                          cashbackRule: event.target.value,
                        },
                      }))
                    }
                  />
                </Field>
              </div>
            </AdminCard>

            <AdminCard>
              <AdminCardHeader title="8. Notifications Config" />
              <div className="mt-4 space-y-4">
                <ToggleField
                  label="SMS Enabled"
                  checked={draft.notificationsConfig.smsEnabled}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      notificationsConfig: {
                        ...current.notificationsConfig,
                        smsEnabled: checked,
                      },
                    }))
                  }
                />
                <ToggleField
                  label="Email Enabled"
                  checked={draft.notificationsConfig.emailEnabled}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      notificationsConfig: {
                        ...current.notificationsConfig,
                        emailEnabled: checked,
                      },
                    }))
                  }
                />
                <ToggleField
                  label="Deposit Success Event"
                  checked={draft.notificationsConfig.events.depositSuccess}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      notificationsConfig: {
                        ...current.notificationsConfig,
                        events: {
                          ...current.notificationsConfig.events,
                          depositSuccess: checked,
                        },
                      },
                    }))
                  }
                />
                <ToggleField
                  label="Withdrawal Success Event"
                  checked={draft.notificationsConfig.events.withdrawalSuccess}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      notificationsConfig: {
                        ...current.notificationsConfig,
                        events: {
                          ...current.notificationsConfig.events,
                          withdrawalSuccess: checked,
                        },
                      },
                    }))
                  }
                />
                <ToggleField
                  label="Bet Placed Event"
                  checked={draft.notificationsConfig.events.betPlaced}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      notificationsConfig: {
                        ...current.notificationsConfig,
                        events: {
                          ...current.notificationsConfig.events,
                          betPlaced: checked,
                        },
                      },
                    }))
                  }
                />
                <ToggleField
                  label="Bet Won/Lost Event"
                  checked={draft.notificationsConfig.events.betResult}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      notificationsConfig: {
                        ...current.notificationsConfig,
                        events: {
                          ...current.notificationsConfig.events,
                          betResult: checked,
                        },
                      },
                    }))
                  }
                />
                <ToggleField
                  label="Admin Alert Events"
                  checked={draft.notificationsConfig.events.adminAlerts}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      notificationsConfig: {
                        ...current.notificationsConfig,
                        events: {
                          ...current.notificationsConfig.events,
                          adminAlerts: checked,
                        },
                      },
                    }))
                  }
                />
              </div>
            </AdminCard>
          </>
        )}

        {(activeSection === "integrations" || activeSection === "security") && (
          <>
            <AdminCard>
              <AdminCardHeader title="9. API & Integrations" />
              <div className="mt-4 grid gap-4">
                <Field label="Sports API Key">
                  <input
                    className={inputClassName}
                    value={draft.apiAndIntegrationsConfig.sportsApiKey}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        apiAndIntegrationsConfig: {
                          ...current.apiAndIntegrationsConfig,
                          sportsApiKey: event.target.value,
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Odds Provider">
                  <input
                    className={inputClassName}
                    value={draft.apiAndIntegrationsConfig.oddsProviderName}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        apiAndIntegrationsConfig: {
                          ...current.apiAndIntegrationsConfig,
                          oddsProviderName: event.target.value,
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Primary Webhook URL">
                  <input
                    className={inputClassName}
                    value={draft.apiAndIntegrationsConfig.primaryWebhookUrl}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        apiAndIntegrationsConfig: {
                          ...current.apiAndIntegrationsConfig,
                          primaryWebhookUrl: event.target.value,
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Fallback Webhook URL">
                  <input
                    className={inputClassName}
                    value={draft.apiAndIntegrationsConfig.fallbackWebhookUrl}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        apiAndIntegrationsConfig: {
                          ...current.apiAndIntegrationsConfig,
                          fallbackWebhookUrl: event.target.value,
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Retry Attempts">
                  <input
                    className={inputClassName}
                    type="number"
                    value={draft.apiAndIntegrationsConfig.retryAttempts}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        apiAndIntegrationsConfig: {
                          ...current.apiAndIntegrationsConfig,
                          retryAttempts: toNumber(event.target.value, 0),
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Retry Backoff (ms)">
                  <input
                    className={inputClassName}
                    type="number"
                    value={draft.apiAndIntegrationsConfig.retryBackoffMs}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        apiAndIntegrationsConfig: {
                          ...current.apiAndIntegrationsConfig,
                          retryBackoffMs: toNumber(event.target.value, 0),
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Rate Limit (requests/min)">
                  <input
                    className={inputClassName}
                    type="number"
                    value={draft.apiAndIntegrationsConfig.requestsPerMinute}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        apiAndIntegrationsConfig: {
                          ...current.apiAndIntegrationsConfig,
                          requestsPerMinute: toNumber(event.target.value, 0),
                        },
                      }))
                    }
                  />
                </Field>
              </div>
            </AdminCard>

            <AdminCard>
              <AdminCardHeader title="10. Security Config" />
              <div className="mt-4 space-y-4">
                <ToggleField
                  label="Admin 2FA Required"
                  checked={draft.securityConfig.adminTwoFactorRequired}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      securityConfig: {
                        ...current.securityConfig,
                        adminTwoFactorRequired: checked,
                      },
                    }))
                  }
                />
                <Field label="Password Minimum Length">
                  <input
                    className={inputClassName}
                    type="number"
                    value={draft.securityConfig.passwordMinLength}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        securityConfig: {
                          ...current.securityConfig,
                          passwordMinLength: toNumber(event.target.value, 8),
                        },
                      }))
                    }
                  />
                </Field>
                <ToggleField
                  label="Require Uppercase"
                  checked={draft.securityConfig.requireUppercase}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      securityConfig: {
                        ...current.securityConfig,
                        requireUppercase: checked,
                      },
                    }))
                  }
                />
                <ToggleField
                  label="Require Number"
                  checked={draft.securityConfig.requireNumber}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      securityConfig: {
                        ...current.securityConfig,
                        requireNumber: checked,
                      },
                    }))
                  }
                />
                <ToggleField
                  label="Require Special Character"
                  checked={draft.securityConfig.requireSpecialChar}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      securityConfig: {
                        ...current.securityConfig,
                        requireSpecialChar: checked,
                      },
                    }))
                  }
                />
                <Field label="Session Timeout (minutes)">
                  <input
                    className={inputClassName}
                    type="number"
                    value={draft.securityConfig.sessionTimeoutMinutes}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        securityConfig: {
                          ...current.securityConfig,
                          sessionTimeoutMinutes: toNumber(
                            event.target.value,
                            60,
                          ),
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Max Login Attempts">
                  <input
                    className={inputClassName}
                    type="number"
                    value={draft.securityConfig.maxLoginAttempts}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        securityConfig: {
                          ...current.securityConfig,
                          maxLoginAttempts: toNumber(event.target.value, 5),
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="IP Whitelist">
                  <textarea
                    className={textareaClassName}
                    rows={3}
                    value={draft.securityConfig.ipWhitelist.join("\n")}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        securityConfig: {
                          ...current.securityConfig,
                          ipWhitelist: parseLineSeparatedArray(
                            event.target.value,
                          ),
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="IP Blacklist">
                  <textarea
                    className={textareaClassName}
                    rows={3}
                    value={draft.securityConfig.ipBlacklist.join("\n")}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        securityConfig: {
                          ...current.securityConfig,
                          ipBlacklist: parseLineSeparatedArray(
                            event.target.value,
                          ),
                        },
                      }))
                    }
                  />
                </Field>
              </div>
            </AdminCard>
          </>
        )}

        {(activeSection === "finance" || activeSection === "affiliate") && (
          <>
            <AdminCard>
              <AdminCardHeader title="11. Tax & Financial Rules" />
              <div className="mt-4 grid gap-4">
                {[
                  ["Tax % on Winnings", "winningsTaxPercent"],
                  ["Tax % on Deposits", "depositTaxPercent"],
                  ["Commission %", "commissionPercent"],
                ].map(([label, key]) => (
                  <Field key={key} label={label}>
                    <input
                      type="number"
                      className={inputClassName}
                      value={
                        draft.taxAndFinancialRules[
                          key as keyof AdminSettingsConfig["taxAndFinancialRules"]
                        ] as number
                      }
                      onChange={(event) =>
                        withDraft((current) => ({
                          ...current,
                          taxAndFinancialRules: {
                            ...current.taxAndFinancialRules,
                            [key]: toNumber(event.target.value, 0),
                          },
                        }))
                      }
                    />
                  </Field>
                ))}
                <Field label="Rounding Rule">
                  <select
                    className={inputClassName}
                    value={draft.taxAndFinancialRules.roundingRule}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        taxAndFinancialRules: {
                          ...current.taxAndFinancialRules,
                          roundingRule: event.target.value as
                            | "nearest_1"
                            | "nearest_5"
                            | "nearest_10"
                            | "floor"
                            | "ceil",
                        },
                      }))
                    }
                  >
                    <option value="nearest_1">Nearest 1</option>
                    <option value="nearest_5">Nearest 5</option>
                    <option value="nearest_10">Nearest 10</option>
                    <option value="floor">Floor</option>
                    <option value="ceil">Ceil</option>
                  </select>
                </Field>
              </div>
            </AdminCard>

            <AdminCard>
              <AdminCardHeader title="12. Affiliate / Agent Config" />
              <div className="mt-4 space-y-4">
                <Field label="Commission Percentage">
                  <input
                    type="number"
                    className={inputClassName}
                    value={draft.affiliateAndAgentConfig.commissionPercent}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        affiliateAndAgentConfig: {
                          ...current.affiliateAndAgentConfig,
                          commissionPercent: toNumber(event.target.value, 0),
                        },
                      }))
                    }
                  />
                </Field>
                <ToggleField
                  label="Multi-level Referrals"
                  checked={
                    draft.affiliateAndAgentConfig.multiLevelReferralsEnabled
                  }
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      affiliateAndAgentConfig: {
                        ...current.affiliateAndAgentConfig,
                        multiLevelReferralsEnabled: checked,
                      },
                    }))
                  }
                />
                <Field label="Minimum Payout Threshold">
                  <input
                    type="number"
                    className={inputClassName}
                    value={draft.affiliateAndAgentConfig.minimumPayoutThreshold}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        affiliateAndAgentConfig: {
                          ...current.affiliateAndAgentConfig,
                          minimumPayoutThreshold: toNumber(
                            event.target.value,
                            0,
                          ),
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Affiliate Withdrawal Rules">
                  <textarea
                    className={textareaClassName}
                    rows={3}
                    value={draft.affiliateAndAgentConfig.withdrawalRule}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        affiliateAndAgentConfig: {
                          ...current.affiliateAndAgentConfig,
                          withdrawalRule: event.target.value,
                        },
                      }))
                    }
                  />
                </Field>
              </div>
            </AdminCard>
          </>
        )}

        {(activeSection === "legal" || activeSection === "operations") && (
          <>
            <AdminCard>
              <AdminCardHeader title="13. Content & Legal" />
              <div className="mt-4 grid gap-4">
                <Field label="Terms & Conditions">
                  <textarea
                    className={textareaClassName}
                    rows={6}
                    value={draft.contentAndLegal.termsAndConditions}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        contentAndLegal: {
                          ...current.contentAndLegal,
                          termsAndConditions: event.target.value,
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Privacy Policy">
                  <textarea
                    className={textareaClassName}
                    rows={6}
                    value={draft.contentAndLegal.privacyPolicy}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        contentAndLegal: {
                          ...current.contentAndLegal,
                          privacyPolicy: event.target.value,
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Responsible Gambling Message">
                  <textarea
                    className={textareaClassName}
                    rows={3}
                    value={draft.contentAndLegal.responsibleGamblingMessage}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        contentAndLegal: {
                          ...current.contentAndLegal,
                          responsibleGamblingMessage: event.target.value,
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Support Contact Info">
                  <input
                    className={inputClassName}
                    value={draft.contentAndLegal.supportContactInfo}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        contentAndLegal: {
                          ...current.contentAndLegal,
                          supportContactInfo: event.target.value,
                        },
                      }))
                    }
                  />
                </Field>
              </div>
            </AdminCard>

            <AdminCard>
              <AdminCardHeader title="14. Operational Controls (Important)" />
              <div className="mt-4 grid gap-4">
                <Field label="Odds Refresh Interval (seconds)">
                  <input
                    className={inputClassName}
                    type="number"
                    value={draft.operationalControls.oddsRefreshIntervalSeconds}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        operationalControls: {
                          ...current.operationalControls,
                          oddsRefreshIntervalSeconds: toNumber(
                            event.target.value,
                            30,
                          ),
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Event Sync Interval (seconds)">
                  <input
                    className={inputClassName}
                    type="number"
                    value={draft.operationalControls.eventSyncIntervalSeconds}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        operationalControls: {
                          ...current.operationalControls,
                          eventSyncIntervalSeconds: toNumber(
                            event.target.value,
                            300,
                          ),
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Settlement Mode">
                  <select
                    className={inputClassName}
                    value={draft.operationalControls.settlementMode}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        operationalControls: {
                          ...current.operationalControls,
                          settlementMode: event.target.value as
                            | "automatic"
                            | "manual"
                            | "hybrid",
                        },
                      }))
                    }
                  >
                    <option value="automatic">Automatic</option>
                    <option value="manual">Manual</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </Field>
                <Field label="Auto-settle Delay (minutes)">
                  <input
                    className={inputClassName}
                    type="number"
                    value={draft.operationalControls.autoSettleDelayMinutes}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        operationalControls: {
                          ...current.operationalControls,
                          autoSettleDelayMinutes: toNumber(
                            event.target.value,
                            0,
                          ),
                        },
                      }))
                    }
                  />
                </Field>
              </div>
            </AdminCard>
          </>
        )}

        {(activeSection === "audit" || activeSection === "rg") && (
          <>
            <AdminCard>
              <AdminCardHeader title="15. Audit & Monitoring (Important)" />
              <div className="mt-4 space-y-4">
                <Field label="Audit Retention Days">
                  <input
                    className={inputClassName}
                    type="number"
                    value={draft.auditAndMonitoring.auditRetentionDays}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        auditAndMonitoring: {
                          ...current.auditAndMonitoring,
                          auditRetentionDays: toNumber(event.target.value, 365),
                        },
                      }))
                    }
                  />
                </Field>
                <ToggleField
                  label="Require Second Approval For Critical Changes"
                  checked={
                    draft.auditAndMonitoring
                      .requireSecondApprovalForCriticalChanges
                  }
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      auditAndMonitoring: {
                        ...current.auditAndMonitoring,
                        requireSecondApprovalForCriticalChanges: checked,
                      },
                    }))
                  }
                />
                <Field label="Incident Alert Channel">
                  <select
                    className={inputClassName}
                    value={draft.auditAndMonitoring.incidentAlertChannel}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        auditAndMonitoring: {
                          ...current.auditAndMonitoring,
                          incidentAlertChannel: event.target.value as
                            | "email"
                            | "sms"
                            | "both",
                        },
                      }))
                    }
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="both">Both</option>
                  </select>
                </Field>
                <Field label="Anomaly Threshold Score">
                  <input
                    className={inputClassName}
                    type="number"
                    value={draft.auditAndMonitoring.anomalyScoreThreshold}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        auditAndMonitoring: {
                          ...current.auditAndMonitoring,
                          anomalyScoreThreshold: toNumber(
                            event.target.value,
                            70,
                          ),
                        },
                      }))
                    }
                  />
                </Field>
              </div>
            </AdminCard>

            <AdminCard>
              <AdminCardHeader title="16. Responsible Gaming Controls (Important)" />
              <div className="mt-4 space-y-4">
                <ToggleField
                  label="Self-exclusion Enabled"
                  checked={draft.responsibleGamingControls.selfExclusionEnabled}
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      responsibleGamingControls: {
                        ...current.responsibleGamingControls,
                        selfExclusionEnabled: checked,
                      },
                    }))
                  }
                />
                <Field label="Default Daily Stake Limit">
                  <input
                    className={inputClassName}
                    type="number"
                    value={
                      draft.responsibleGamingControls.defaultDailyStakeLimit
                    }
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        responsibleGamingControls: {
                          ...current.responsibleGamingControls,
                          defaultDailyStakeLimit: toNumber(
                            event.target.value,
                            0,
                          ),
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Cool-off Period (hours)">
                  <input
                    className={inputClassName}
                    type="number"
                    value={draft.responsibleGamingControls.coolOffPeriodHours}
                    onChange={(event) =>
                      withDraft((current) => ({
                        ...current,
                        responsibleGamingControls: {
                          ...current.responsibleGamingControls,
                          coolOffPeriodHours: toNumber(event.target.value, 0),
                        },
                      }))
                    }
                  />
                </Field>
                <ToggleField
                  label="Mandatory Loss-limit Prompt"
                  checked={
                    draft.responsibleGamingControls.mandatoryLossLimitPrompt
                  }
                  onChange={(checked) =>
                    withDraft((current) => ({
                      ...current,
                      responsibleGamingControls: {
                        ...current.responsibleGamingControls,
                        mandatoryLossLimitPrompt: checked,
                      },
                    }))
                  }
                />
              </div>
            </AdminCard>
          </>
        )}
      </div>
    </div>
  );
}
