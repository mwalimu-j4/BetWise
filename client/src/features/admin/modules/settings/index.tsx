import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Banknote,
  Bell,
  Briefcase,
  Building2,
  CreditCard,
  FileText,
  Globe2,
  Loader2,
  Lock,
  Percent,
  Search,
  Shield,
  TicketPercent,
  UserCog,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AdminCard,
  AdminSectionHeader,
  AdminCardHeader,
} from "../../components/ui";
import {
  type AdminSettingsConfig,
  useAdminSettings,
  useUpdateAdminSettings,
} from "../../hooks/useAdminSettings";

type FieldType = "text" | "number" | "textarea" | "switch" | "select" | "list";

type FieldDefinition = {
  path: string;
  label: string;
  type: FieldType;
  hint?: string;
  options?: Array<{ label: string; value: string }>;
};

type SectionDefinition = {
  id: string;
  title: string;
  subtitle: string;
  group: "System" | "Operations" | "Risk & Compliance" | "Commercial";
  icon: ReactNode;
  fields: FieldDefinition[];
};

const inputClassName =
  "h-10 w-full rounded-lg border border-admin-border bg-admin-surface px-3 text-sm text-admin-text-primary outline-none transition focus:border-admin-border-strong";
const textareaClassName =
  "w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2.5 text-sm text-admin-text-primary outline-none transition focus:border-admin-border-strong";

function cloneSettings(settings: AdminSettingsConfig) {
  return JSON.parse(JSON.stringify(settings)) as AdminSettingsConfig;
}

function parseList(value: string) {
  return value
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function toNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (typeof acc === "object" && acc !== null && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

function setByPath<T extends object>(obj: T, path: string, value: unknown): T {
  const clone = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
  const parts = path.split(".");
  let current: Record<string, unknown> = clone;

  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    const next = current[key];

    if (typeof next === "object" && next !== null) {
      current = next as Record<string, unknown>;
    } else {
      current[key] = {};
      current = current[key] as Record<string, unknown>;
    }
  }

  current[parts[parts.length - 1]] = value;
  return clone as T;
}

const sectionDefinitions: SectionDefinition[] = [
  {
    id: "general",
    title: "General System Config",
    subtitle: "Platform identity, environment, and access controls",
    group: "System",
    icon: <Building2 size={16} />,
    fields: [
      { path: "generalSystemConfig.platformName", label: "Platform name", type: "text" },
      {
        path: "generalSystemConfig.environment",
        label: "Environment",
        type: "select",
        options: [
          { label: "Sandbox", value: "sandbox" },
          { label: "Live", value: "live" },
        ],
      },
      { path: "generalSystemConfig.defaultCurrency", label: "Default currency", type: "text" },
      { path: "generalSystemConfig.timezone", label: "Timezone", type: "text" },
      { path: "generalSystemConfig.maintenanceMode", label: "Maintenance mode", type: "switch" },
      { path: "generalSystemConfig.registrationEnabled", label: "Registration enabled", type: "switch" },
    ],
  },
  {
    id: "user-defaults",
    title: "User Defaults & Restrictions",
    subtitle: "Wallet defaults, limits, and account verification rules",
    group: "System",
    icon: <UserCog size={16} />,
    fields: [
      { path: "userDefaultsAndRestrictions.defaultWalletBalance", label: "Default wallet balance", type: "number" },
      { path: "userDefaultsAndRestrictions.minDeposit", label: "Min deposit", type: "number" },
      { path: "userDefaultsAndRestrictions.maxDeposit", label: "Max deposit", type: "number" },
      { path: "userDefaultsAndRestrictions.minWithdrawal", label: "Min withdrawal", type: "number" },
      { path: "userDefaultsAndRestrictions.maxWithdrawal", label: "Max withdrawal", type: "number" },
      { path: "userDefaultsAndRestrictions.dailyTransactionLimit", label: "Daily transaction limit", type: "number" },
      { path: "userDefaultsAndRestrictions.maxActiveBetsPerUser", label: "Max active bets per user", type: "number" },
      {
        path: "userDefaultsAndRestrictions.autoVerificationRule",
        label: "Account auto-verification",
        type: "select",
        options: [
          { label: "None", value: "none" },
          { label: "Email", value: "email" },
          { label: "Email and phone", value: "email_and_phone" },
        ],
      },
    ],
  },
  {
    id: "kyc",
    title: "KYC / Compliance Config",
    subtitle: "Identity checks, age gate, and geo restrictions",
    group: "Risk & Compliance",
    icon: <Shield size={16} />,
    fields: [
      { path: "kycAndComplianceConfig.kycRequired", label: "KYC required", type: "switch" },
      { path: "kycAndComplianceConfig.requiredFields.id", label: "Require ID", type: "switch" },
      { path: "kycAndComplianceConfig.requiredFields.phone", label: "Require phone", type: "switch" },
      { path: "kycAndComplianceConfig.requiredFields.email", label: "Require email", type: "switch" },
      { path: "kycAndComplianceConfig.withdrawalRequiresKyc", label: "Withdrawal requires KYC", type: "switch" },
      { path: "kycAndComplianceConfig.minimumAge", label: "Age restriction", type: "number" },
      {
        path: "kycAndComplianceConfig.allowedCountries",
        label: "Allowed countries",
        type: "list",
        hint: "Use comma or newline separated ISO country codes, for example KE, UG, TZ",
      },
    ],
  },
  {
    id: "payments",
    title: "Payments (M-Pesa / Others)",
    subtitle: "Payment method switches and M-Pesa credentials",
    group: "Operations",
    icon: <CreditCard size={16} />,
    fields: [
      { path: "paymentsConfig.methods.mpesa", label: "Enable M-Pesa", type: "switch" },
      { path: "paymentsConfig.methods.bankTransfer", label: "Enable bank transfer", type: "switch" },
      { path: "paymentsConfig.methods.airtelMoney", label: "Enable Airtel Money", type: "switch" },
      { path: "paymentsConfig.methods.card", label: "Enable card", type: "switch" },
      { path: "paymentsConfig.mpesa.shortcode", label: "M-Pesa shortcode", type: "text" },
      { path: "paymentsConfig.mpesa.consumerKey", label: "M-Pesa consumer key", type: "text" },
      { path: "paymentsConfig.mpesa.consumerSecret", label: "M-Pesa consumer secret", type: "text" },
      { path: "paymentsConfig.mpesa.passkey", label: "M-Pesa passkey", type: "text" },
      { path: "paymentsConfig.mpesa.callbackUrl", label: "M-Pesa callback URL", type: "text" },
      { path: "paymentsConfig.mpesa.transactionFeePercent", label: "Transaction fees (%)", type: "number" },
      { path: "paymentsConfig.mpesa.autoWithdrawEnabled", label: "Auto-withdraw", type: "switch" },
      { path: "paymentsConfig.mpesa.withdrawalApprovalThreshold", label: "Withdrawal approval threshold", type: "number" },
    ],
  },
  {
    id: "betting-engine",
    title: "Betting Engine Config",
    subtitle: "Staking boundaries, odds behavior, and live controls",
    group: "Operations",
    icon: <Wrench size={16} />,
    fields: [
      { path: "bettingEngineConfig.minBetAmount", label: "Minimum bet amount", type: "number" },
      { path: "bettingEngineConfig.maxBetAmount", label: "Maximum bet amount", type: "number" },
      { path: "bettingEngineConfig.maxWinPerBet", label: "Max win per bet", type: "number" },
      { path: "bettingEngineConfig.oddsMarginPercent", label: "Odds margin (%)", type: "number" },
      { path: "bettingEngineConfig.betDelayMs", label: "Bet delay (ms)", type: "number" },
      { path: "bettingEngineConfig.cashoutEnabled", label: "Cashout enabled", type: "switch" },
      { path: "bettingEngineConfig.cashoutMarginPercent", label: "Cashout margin (%)", type: "number" },
      { path: "bettingEngineConfig.allowLiveBetting", label: "Allow live betting", type: "switch" },
    ],
  },
  {
    id: "risk",
    title: "Risk Management Config",
    subtitle: "Exposure controls, payout risk, and suspicious activity handling",
    group: "Risk & Compliance",
    icon: <Shield size={16} />,
    fields: [
      { path: "riskManagementConfig.maxExposurePerEvent", label: "Max exposure per event", type: "number" },
      { path: "riskManagementConfig.maxExposurePerMarket", label: "Max exposure per market", type: "number" },
      { path: "riskManagementConfig.maxPayoutPerDay", label: "Max payout per day", type: "number" },
      { path: "riskManagementConfig.highRiskBetThreshold", label: "High-risk bet threshold", type: "number" },
      { path: "riskManagementConfig.autoBlockSuspiciousUsers", label: "Auto-block suspicious users", type: "switch" },
    ],
  },
  {
    id: "bonus",
    title: "Bonuses & Promotions Config",
    subtitle: "Welcome rewards, wagering rules, and cashback policies",
    group: "Commercial",
    icon: <TicketPercent size={16} />,
    fields: [
      { path: "bonusesAndPromotionsConfig.welcomeBonusEnabled", label: "Welcome bonus enabled", type: "switch" },
      {
        path: "bonusesAndPromotionsConfig.bonusMode",
        label: "Bonus mode",
        type: "select",
        options: [
          { label: "Fixed amount", value: "fixed_amount" },
          { label: "Percentage", value: "percentage" },
        ],
      },
      { path: "bonusesAndPromotionsConfig.bonusAmount", label: "Bonus amount", type: "number" },
      { path: "bonusesAndPromotionsConfig.bonusPercent", label: "Bonus percentage", type: "number" },
      { path: "bonusesAndPromotionsConfig.wageringRequirementMultiplier", label: "Wagering requirement (x)", type: "number" },
      { path: "bonusesAndPromotionsConfig.bonusExpiryHours", label: "Bonus expiry (hours)", type: "number" },
      { path: "bonusesAndPromotionsConfig.maxBonusPerUser", label: "Max bonus per user", type: "number" },
      { path: "bonusesAndPromotionsConfig.cashbackRule", label: "Cashback rules", type: "textarea" },
    ],
  },
  {
    id: "notifications",
    title: "Notifications Config",
    subtitle: "Event messaging channels for users and admins",
    group: "Operations",
    icon: <Bell size={16} />,
    fields: [
      { path: "notificationsConfig.smsEnabled", label: "SMS enabled", type: "switch" },
      { path: "notificationsConfig.emailEnabled", label: "Email enabled", type: "switch" },
      { path: "notificationsConfig.events.depositSuccess", label: "Deposit success", type: "switch" },
      { path: "notificationsConfig.events.withdrawalSuccess", label: "Withdrawal success", type: "switch" },
      { path: "notificationsConfig.events.betPlaced", label: "Bet placed", type: "switch" },
      { path: "notificationsConfig.events.betResult", label: "Bet won/lost", type: "switch" },
      { path: "notificationsConfig.events.adminAlerts", label: "Admin alerts", type: "switch" },
    ],
  },
  {
    id: "api",
    title: "API & Integrations",
    subtitle: "Provider connectivity, webhook delivery, and retry strategy",
    group: "Operations",
    icon: <Globe2 size={16} />,
    fields: [
      { path: "apiAndIntegrationsConfig.sportsApiKey", label: "Sports API key", type: "text" },
      { path: "apiAndIntegrationsConfig.oddsProviderName", label: "Odds provider", type: "text" },
      { path: "apiAndIntegrationsConfig.primaryWebhookUrl", label: "Primary webhook URL", type: "text" },
      { path: "apiAndIntegrationsConfig.fallbackWebhookUrl", label: "Fallback webhook URL", type: "text" },
      { path: "apiAndIntegrationsConfig.retryAttempts", label: "Retry attempts", type: "number" },
      { path: "apiAndIntegrationsConfig.retryBackoffMs", label: "Retry backoff (ms)", type: "number" },
      { path: "apiAndIntegrationsConfig.requestsPerMinute", label: "Rate limit (requests/min)", type: "number" },
    ],
  },
  {
    id: "security",
    title: "Security Config",
    subtitle: "Authentication, password policy, and session controls",
    group: "Risk & Compliance",
    icon: <Lock size={16} />,
    fields: [
      { path: "securityConfig.adminTwoFactorRequired", label: "Admin 2FA required", type: "switch" },
      { path: "securityConfig.passwordMinLength", label: "Password minimum length", type: "number" },
      { path: "securityConfig.requireUppercase", label: "Require uppercase", type: "switch" },
      { path: "securityConfig.requireNumber", label: "Require number", type: "switch" },
      { path: "securityConfig.requireSpecialChar", label: "Require special character", type: "switch" },
      { path: "securityConfig.sessionTimeoutMinutes", label: "Session timeout (minutes)", type: "number" },
      { path: "securityConfig.maxLoginAttempts", label: "Login attempt limits", type: "number" },
      {
        path: "securityConfig.ipWhitelist",
        label: "IP whitelist",
        type: "list",
        hint: "Use comma or newline separated IPs",
      },
      {
        path: "securityConfig.ipBlacklist",
        label: "IP blacklist",
        type: "list",
        hint: "Use comma or newline separated IPs",
      },
    ],
  },
  {
    id: "tax",
    title: "Tax & Financial Rules",
    subtitle: "Taxation, commissions, and rounding policy",
    group: "Commercial",
    icon: <Percent size={16} />,
    fields: [
      { path: "taxAndFinancialRules.winningsTaxPercent", label: "Tax on winnings (%)", type: "number" },
      { path: "taxAndFinancialRules.depositTaxPercent", label: "Tax on deposits (%)", type: "number" },
      { path: "taxAndFinancialRules.commissionPercent", label: "Commission settings (%)", type: "number" },
      {
        path: "taxAndFinancialRules.roundingRule",
        label: "Rounding rule",
        type: "select",
        options: [
          { label: "Nearest 1", value: "nearest_1" },
          { label: "Nearest 5", value: "nearest_5" },
          { label: "Nearest 10", value: "nearest_10" },
          { label: "Floor", value: "floor" },
          { label: "Ceil", value: "ceil" },
        ],
      },
    ],
  },
  {
    id: "affiliate",
    title: "Affiliate / Agent Config",
    subtitle: "Referral economics and payout policies",
    group: "Commercial",
    icon: <Briefcase size={16} />,
    fields: [
      { path: "affiliateAndAgentConfig.commissionPercent", label: "Commission percentage", type: "number" },
      { path: "affiliateAndAgentConfig.multiLevelReferralsEnabled", label: "Multi-level referrals", type: "switch" },
      { path: "affiliateAndAgentConfig.minimumPayoutThreshold", label: "Minimum payout threshold", type: "number" },
      { path: "affiliateAndAgentConfig.withdrawalRule", label: "Affiliate withdrawal rules", type: "textarea" },
    ],
  },
  {
    id: "legal",
    title: "Content & Legal",
    subtitle: "Legal copy and player-facing support information",
    group: "System",
    icon: <FileText size={16} />,
    fields: [
      { path: "contentAndLegal.termsAndConditions", label: "Terms & Conditions", type: "textarea" },
      { path: "contentAndLegal.privacyPolicy", label: "Privacy Policy", type: "textarea" },
      { path: "contentAndLegal.responsibleGamblingMessage", label: "Responsible gambling message", type: "textarea" },
      { path: "contentAndLegal.supportContactInfo", label: "Support contact info", type: "text" },
    ],
  },
];

export default function Settings() {
  const { data, isLoading, isError, error } = useAdminSettings();
  const updateSettings = useUpdateAdminSettings();

  const [draft, setDraft] = useState<AdminSettingsConfig | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [modalDraft, setModalDraft] = useState<AdminSettingsConfig | null>(null);

  useEffect(() => {
    if (data?.config) {
      setDraft(cloneSettings(data.config));
    }
  }, [data?.config]);

  const selectedSection = useMemo(
    () => sectionDefinitions.find((section) => section.id === activeSectionId) ?? null,
    [activeSectionId],
  );

  const filteredSections = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return sectionDefinitions;
    }

    return sectionDefinitions.filter((section) => {
      const haystack = [
        section.title,
        section.subtitle,
        ...section.fields.map((field) => field.label),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [searchTerm]);

  const grouped = useMemo(() => {
    return {
      System: filteredSections.filter((section) => section.group === "System"),
      Operations: filteredSections.filter((section) => section.group === "Operations"),
      "Risk & Compliance": filteredSections.filter(
        (section) => section.group === "Risk & Compliance",
      ),
      Commercial: filteredSections.filter((section) => section.group === "Commercial"),
    };
  }, [filteredSections]);

  const openSectionModal = (sectionId: string) => {
    if (!draft) {
      return;
    }

    setModalDraft(cloneSettings(draft));
    setActiveSectionId(sectionId);
  };

  const closeModal = () => {
    setActiveSectionId(null);
    setModalDraft(null);
  };

  const updateModalField = (field: FieldDefinition, rawValue: string | boolean) => {
    setModalDraft((current) => {
      if (!current) {
        return current;
      }

      const currentValue = getByPath(current, field.path);
      let nextValue: unknown = rawValue;

      if (field.type === "number") {
        nextValue = toNumber(String(rawValue), typeof currentValue === "number" ? currentValue : 0);
      }

      if (field.type === "list") {
        nextValue = parseList(String(rawValue));
      }

      return setByPath(current, field.path, nextValue);
    });
  };

  const saveSection = async () => {
    if (!modalDraft) {
      return;
    }

    try {
      const result = await updateSettings.mutateAsync(modalDraft);
      setDraft(cloneSettings(result.config));
      toast.success("Settings updated successfully.");
      closeModal();
    } catch (mutationError: unknown) {
      const message =
        typeof mutationError === "object" &&
        mutationError !== null &&
        "response" in mutationError &&
        typeof (mutationError as { response?: unknown }).response === "object"
          ? ((mutationError as { response?: { data?: { message?: string } } }).response
              ?.data?.message ?? "Failed to update settings.")
          : "Failed to update settings.";
      toast.error(message);
    }
  };

  if (isLoading || !draft) {
    return (
      <AdminCard>
        <div className="flex min-h-[260px] items-center justify-center gap-2 text-admin-text-muted">
          <Loader2 size={18} className="animate-spin" />
          Loading settings...
        </div>
      </AdminCard>
    );
  }

  if (isError) {
    return (
      <AdminCard>
        <p className="text-sm font-semibold text-admin-red">Failed to load settings.</p>
        <p className="mt-1 text-sm text-admin-text-muted">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </AdminCard>
    );
  }

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Settings"
        subtitle="Centralized configuration for your betting platform operations"
      />

      <AdminCard className="bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_120px)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-admin-text-secondary">
            Search and manage configuration modules with focused edit modals.
          </div>
          <div className="relative w-full sm:w-[380px]">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-muted"
            />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search setting..."
              className="h-10 w-full rounded-lg border border-admin-border bg-admin-surface pl-9 pr-3 text-sm text-admin-text-primary outline-none transition focus:border-admin-border-strong"
            />
          </div>
        </div>
      </AdminCard>

      {(
        Object.entries(grouped) as Array<
          ["System" | "Operations" | "Risk & Compliance" | "Commercial", SectionDefinition[]]
        >
      ).map(([groupName, sections]) =>
        sections.length === 0 ? null : (
          <section key={groupName} className="space-y-3">
            <h2 className="text-lg font-semibold text-admin-text-primary">{groupName}</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {sections.map((section) => (
                <AdminCard
                  key={section.id}
                  className="border-admin-border bg-admin-card/95 p-4 transition hover:border-admin-border-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-admin-text-primary">{section.title}</p>
                      <p className="text-xs leading-5 text-admin-text-muted">{section.subtitle}</p>
                    </div>
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-admin-surface text-admin-accent">
                      {section.icon}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-admin-text-muted">
                      {section.fields.length} configurable options
                    </span>
                    <Button
                      onClick={() => openSectionModal(section.id)}
                      className="h-8 rounded-md px-3 text-xs"
                    >
                      Configure
                    </Button>
                  </div>
                </AdminCard>
              ))}
            </div>
          </section>
        ),
      )}

      <Dialog open={Boolean(selectedSection)} onOpenChange={(open) => (!open ? closeModal() : null)}>
        <DialogContent className="max-h-[88vh] overflow-hidden border-admin-border bg-admin-card sm:max-w-3xl">
          {selectedSection && modalDraft ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-admin-text-primary">{selectedSection.title}</DialogTitle>
                <DialogDescription className="text-admin-text-muted">
                  {selectedSection.subtitle}
                </DialogDescription>
              </DialogHeader>

              <div className="app-scrollbar grid max-h-[62vh] gap-3 overflow-y-auto px-1">
                <AdminCardHeader
                  title="Configuration Fields"
                  subtitle="Review and update all values before saving"
                />

                {selectedSection.fields.map((field) => {
                  const value = getByPath(modalDraft, field.path);

                  return (
                    <label key={field.path} className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-admin-text-muted">
                        {field.label}
                      </p>

                      {field.type === "text" && (
                        <input
                          className={inputClassName}
                          value={String(value ?? "")}
                          onChange={(event) => updateModalField(field, event.target.value)}
                        />
                      )}

                      {field.type === "number" && (
                        <input
                          className={inputClassName}
                          type="number"
                          value={String(value ?? 0)}
                          onChange={(event) => updateModalField(field, event.target.value)}
                        />
                      )}

                      {field.type === "textarea" && (
                        <textarea
                          className={textareaClassName}
                          rows={4}
                          value={String(value ?? "")}
                          onChange={(event) => updateModalField(field, event.target.value)}
                        />
                      )}

                      {field.type === "select" && (
                        <select
                          className={inputClassName}
                          value={String(value ?? "")}
                          onChange={(event) => updateModalField(field, event.target.value)}
                        >
                          {(field.options ?? []).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}

                      {field.type === "switch" && (
                        <div className="flex h-10 items-center justify-between rounded-lg border border-admin-border bg-admin-surface px-3">
                          <span className="text-sm text-admin-text-secondary">
                            {Boolean(value) ? "Enabled" : "Disabled"}
                          </span>
                          <Switch
                            checked={Boolean(value)}
                            onCheckedChange={(checked) => updateModalField(field, checked)}
                          />
                        </div>
                      )}

                      {field.type === "list" && (
                        <textarea
                          className={textareaClassName}
                          rows={3}
                          value={Array.isArray(value) ? value.join("\n") : ""}
                          onChange={(event) => updateModalField(field, event.target.value)}
                        />
                      )}

                      {field.hint ? (
                        <p className="text-[11px] text-admin-text-muted">{field.hint}</p>
                      ) : null}
                    </label>
                  );
                })}
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={closeModal} disabled={updateSettings.isPending}>
                  Cancel
                </Button>
                <Button onClick={() => void saveSection()} disabled={updateSettings.isPending}>
                  {updateSettings.isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Banknote size={14} />
                      Save changes
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
