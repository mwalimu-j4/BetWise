import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Bell,
  Briefcase,
  Building2,
  CreditCard,
  FileText,
  Globe2,
  Loader2,
  Lock,
  Mail,
  Percent,
  QrCode,
  Sparkles,
  Search,
  Shield,
  ShieldCheck,
  Smartphone,
  TicketPercent,
  UserCog,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/axiosConfig";
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

type AdminTwoFactorStatusResponse = {
  enabled: boolean;
};

type AdminTwoFactorSetupResponse = {
  setupToken: string;
  expiresInSeconds: number;
  qrCodeDataUrl: string;
  manualEntryKey: string;
  message: string;
};

type GenericMessageResponse = {
  message: string;
};

const inputClassName =
  "h-10 w-full rounded-lg border border-admin-border bg-admin-surface px-3 text-sm text-admin-text-primary outline-none transition focus:border-admin-border-strong";
const textareaClassName =
  "w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2.5 text-sm text-admin-text-primary outline-none transition focus:border-admin-border-strong";
const MICROSOFT_AUTHENTICATOR_ANDROID_URL =
  "https://play.google.com/store/apps/details?id=com.azure.authenticator";
const MICROSOFT_AUTHENTICATOR_IOS_URL =
  "https://apps.apple.com/app/microsoft-authenticator/id983156458";
const MICROSOFT_AUTHENTICATOR_FALLBACK_URL =
  "https://www.microsoft.com/security/mobile-authenticator-app";

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

function hasValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "boolean") {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return value !== null && value !== undefined;
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
      {
        path: "generalSystemConfig.platformName",
        label: "Platform name",
        type: "text",
      },
      {
        path: "generalSystemConfig.environment",
        label: "Environment",
        type: "select",
        options: [
          { label: "Sandbox", value: "sandbox" },
          { label: "Live", value: "live" },
        ],
      },
      {
        path: "generalSystemConfig.defaultCurrency",
        label: "Default currency",
        type: "text",
      },
      { path: "generalSystemConfig.timezone", label: "Timezone", type: "text" },
      {
        path: "generalSystemConfig.maintenanceMode",
        label: "Maintenance mode",
        type: "switch",
      },
      {
        path: "generalSystemConfig.registrationEnabled",
        label: "Registration enabled",
        type: "switch",
      },
    ],
  },
  {
    id: "user-defaults",
    title: "User Defaults & Restrictions",
    subtitle: "Wallet defaults, limits, and account verification rules",
    group: "System",
    icon: <UserCog size={16} />,
    fields: [
      {
        path: "userDefaultsAndRestrictions.minDeposit",
        label: "Min deposit",
        type: "number",
      },
      {
        path: "userDefaultsAndRestrictions.maxDeposit",
        label: "Max deposit",
        type: "number",
      },
      {
        path: "userDefaultsAndRestrictions.minWithdrawal",
        label: "Min withdrawal",
        type: "number",
      },
      {
        path: "userDefaultsAndRestrictions.maxWithdrawal",
        label: "Max withdrawal",
        type: "number",
      },
      {
        path: "userDefaultsAndRestrictions.dailyTransactionLimit",
        label: "Daily transaction limit",
        type: "number",
      },
      {
        path: "userDefaultsAndRestrictions.maxActiveBetsPerUser",
        label: "Max active bets per user",
        type: "number",
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
      {
        path: "kycAndComplianceConfig.kycRequired",
        label: "KYC required",
        type: "switch",
      },
      {
        path: "kycAndComplianceConfig.requiredFields.id",
        label: "Require ID",
        type: "switch",
      },
      {
        path: "kycAndComplianceConfig.requiredFields.phone",
        label: "Require phone",
        type: "switch",
      },
      {
        path: "kycAndComplianceConfig.requiredFields.email",
        label: "Require email",
        type: "switch",
      },
      {
        path: "kycAndComplianceConfig.withdrawalRequiresKyc",
        label: "Withdrawal requires KYC",
        type: "switch",
      },
      {
        path: "kycAndComplianceConfig.minimumAge",
        label: "Age restriction",
        type: "number",
      },
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
      {
        path: "paymentsConfig.methods.mpesa",
        label: "Enable M-Pesa",
        type: "switch",
      },
      {
        path: "paymentsConfig.methods.bankTransfer",
        label: "Enable bank transfer",
        type: "switch",
      },
      {
        path: "paymentsConfig.mpesa.shortcode",
        label: "M-Pesa shortcode",
        type: "text",
      },
      {
        path: "paymentsConfig.mpesa.consumerKey",
        label: "M-Pesa consumer key",
        type: "text",
      },
      {
        path: "paymentsConfig.mpesa.consumerSecret",
        label: "M-Pesa consumer secret",
        type: "text",
      },
      {
        path: "paymentsConfig.mpesa.passkey",
        label: "M-Pesa passkey",
        type: "text",
      },
      {
        path: "paymentsConfig.mpesa.callbackUrl",
        label: "M-Pesa callback URL",
        type: "text",
      },
      {
        path: "paymentsConfig.mpesa.transactionFeePercent",
        label: "Transaction fees (%)",
        type: "number",
      },
      {
        path: "paymentsConfig.mpesa.autoWithdrawEnabled",
        label: "Auto-withdraw",
        type: "switch",
      },
      {
        path: "paymentsConfig.mpesa.withdrawalApprovalThreshold",
        label: "Withdrawal approval threshold",
        type: "number",
      },
    ],
  },
  {
    id: "betting-engine",
    title: "Betting Engine Config",
    subtitle: "Staking boundaries, odds behavior, and live controls",
    group: "Operations",
    icon: <Wrench size={16} />,
    fields: [
      {
        path: "bettingEngineConfig.minBetAmount",
        label: "Minimum bet amount",
        type: "number",
      },
      {
        path: "bettingEngineConfig.maxBetAmount",
        label: "Maximum bet amount",
        type: "number",
      },
      {
        path: "bettingEngineConfig.maxWinPerBet",
        label: "Max win per bet",
        type: "number",
      },
      {
        path: "bettingEngineConfig.oddsMarginPercent",
        label: "Odds margin (%)",
        type: "number",
      },
      {
        path: "bettingEngineConfig.betDelayMs",
        label: "Bet delay (ms)",
        type: "number",
      },
      {
        path: "bettingEngineConfig.cashoutEnabled",
        label: "Cashout enabled",
        type: "switch",
      },
      {
        path: "bettingEngineConfig.cashoutMarginPercent",
        label: "Cashout margin (%)",
        type: "number",
      },
      {
        path: "bettingEngineConfig.allowLiveBetting",
        label: "Allow live betting",
        type: "switch",
      },
    ],
  },
  {
    id: "risk",
    title: "Risk Management Config",
    subtitle:
      "Exposure controls, payout risk, and suspicious activity handling",
    group: "Risk & Compliance",
    icon: <Shield size={16} />,
    fields: [
      {
        path: "riskManagementConfig.maxExposurePerEvent",
        label: "Max exposure per event",
        type: "number",
      },
      {
        path: "riskManagementConfig.maxExposurePerMarket",
        label: "Max exposure per market",
        type: "number",
      },
      {
        path: "riskManagementConfig.maxPayoutPerDay",
        label: "Max payout per day",
        type: "number",
      },
      {
        path: "riskManagementConfig.highRiskBetThreshold",
        label: "High-risk bet threshold",
        type: "number",
      },
      {
        path: "riskManagementConfig.autoBlockSuspiciousUsers",
        label: "Auto-block suspicious users",
        type: "switch",
      },
    ],
  },
  {
    id: "bonus",
    title: "Bonuses & Promotions Config",
    subtitle: "Welcome rewards, wagering rules, and cashback policies",
    group: "Commercial",
    icon: <TicketPercent size={16} />,
    fields: [
      {
        path: "bonusesAndPromotionsConfig.welcomeBonusEnabled",
        label: "Welcome bonus enabled",
        type: "switch",
      },
      {
        path: "bonusesAndPromotionsConfig.bonusMode",
        label: "Bonus mode",
        type: "select",
        options: [
          { label: "Fixed amount", value: "fixed_amount" },
          { label: "Percentage", value: "percentage" },
        ],
      },
      {
        path: "bonusesAndPromotionsConfig.bonusAmount",
        label: "Bonus amount",
        type: "number",
      },
      {
        path: "bonusesAndPromotionsConfig.bonusPercent",
        label: "Bonus percentage",
        type: "number",
      },
      {
        path: "bonusesAndPromotionsConfig.wageringRequirementMultiplier",
        label: "Wagering requirement (x)",
        type: "number",
      },
      {
        path: "bonusesAndPromotionsConfig.bonusExpiryHours",
        label: "Bonus expiry (hours)",
        type: "number",
      },
      {
        path: "bonusesAndPromotionsConfig.maxBonusPerUser",
        label: "Max bonus per user",
        type: "number",
      },
      {
        path: "bonusesAndPromotionsConfig.cashbackRule",
        label: "Cashback rules",
        type: "textarea",
      },
    ],
  },
  {
    id: "notifications",
    title: "Notifications Config",
    subtitle: "Event messaging channels for users and admins",
    group: "Operations",
    icon: <Bell size={16} />,
    fields: [
      {
        path: "notificationsConfig.smsEnabled",
        label: "SMS enabled",
        type: "switch",
      },
      {
        path: "notificationsConfig.emailEnabled",
        label: "Email enabled",
        type: "switch",
      },
      {
        path: "notificationsConfig.events.depositSuccess",
        label: "Deposit success",
        type: "switch",
      },
      {
        path: "notificationsConfig.events.withdrawalSuccess",
        label: "Withdrawal success",
        type: "switch",
      },
      {
        path: "notificationsConfig.events.betPlaced",
        label: "Bet placed",
        type: "switch",
      },
      {
        path: "notificationsConfig.events.betResult",
        label: "Bet won/lost",
        type: "switch",
      },
      {
        path: "notificationsConfig.events.adminAlerts",
        label: "Admin alerts",
        type: "switch",
      },
    ],
  },
  {
    id: "api",
    title: "API & Integrations",
    subtitle: "Provider connectivity, webhook delivery, and retry strategy",
    group: "Operations",
    icon: <Globe2 size={16} />,
    fields: [
      {
        path: "apiAndIntegrationsConfig.sportsApiKey",
        label: "Sports API key",
        type: "text",
      },
      {
        path: "apiAndIntegrationsConfig.oddsProviderName",
        label: "Odds provider",
        type: "text",
      },
      {
        path: "apiAndIntegrationsConfig.primaryWebhookUrl",
        label: "Primary webhook URL",
        type: "text",
      },
      {
        path: "apiAndIntegrationsConfig.fallbackWebhookUrl",
        label: "Fallback webhook URL",
        type: "text",
      },
      {
        path: "apiAndIntegrationsConfig.retryAttempts",
        label: "Retry attempts",
        type: "number",
      },
      {
        path: "apiAndIntegrationsConfig.retryBackoffMs",
        label: "Retry backoff (ms)",
        type: "number",
      },
      {
        path: "apiAndIntegrationsConfig.requestsPerMinute",
        label: "Rate limit (requests/min)",
        type: "number",
      },
    ],
  },
  {
    id: "security",
    title: "Security Config",
    subtitle: "Authentication, password policy, and session controls",
    group: "Risk & Compliance",
    icon: <Lock size={16} />,
    fields: [
      {
        path: "securityConfig.adminTwoFactorRequired",
        label: "Admin 2FA required",
        type: "switch",
      },
      {
        path: "securityConfig.passwordMinLength",
        label: "Password minimum length",
        type: "number",
      },
      {
        path: "securityConfig.requireUppercase",
        label: "Require uppercase",
        type: "switch",
      },
      {
        path: "securityConfig.requireNumber",
        label: "Require number",
        type: "switch",
      },
      {
        path: "securityConfig.requireSpecialChar",
        label: "Require special character",
        type: "switch",
      },
      {
        path: "securityConfig.sessionTimeoutMinutes",
        label: "Session timeout (minutes)",
        type: "number",
      },
      {
        path: "securityConfig.maxLoginAttempts",
        label: "Login attempt limits",
        type: "number",
      },
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
      {
        path: "taxAndFinancialRules.winningsTaxPercent",
        label: "Tax on winnings (%)",
        type: "number",
      },
      {
        path: "taxAndFinancialRules.depositTaxPercent",
        label: "Tax on deposits (%)",
        type: "number",
      },
      {
        path: "taxAndFinancialRules.commissionPercent",
        label: "Commission settings (%)",
        type: "number",
      },
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
      {
        path: "affiliateAndAgentConfig.commissionPercent",
        label: "Commission percentage",
        type: "number",
      },
      {
        path: "affiliateAndAgentConfig.multiLevelReferralsEnabled",
        label: "Multi-level referrals",
        type: "switch",
      },
      {
        path: "affiliateAndAgentConfig.minimumPayoutThreshold",
        label: "Minimum payout threshold",
        type: "number",
      },
      {
        path: "affiliateAndAgentConfig.withdrawalRule",
        label: "Affiliate withdrawal rules",
        type: "textarea",
      },
    ],
  },
  {
    id: "legal",
    title: "Content & Legal",
    subtitle: "Legal copy and player-facing support information",
    group: "System",
    icon: <FileText size={16} />,
    fields: [
      {
        path: "contentAndLegal.termsAndConditions",
        label: "Terms & Conditions",
        type: "textarea",
      },
      {
        path: "contentAndLegal.privacyPolicy",
        label: "Privacy Policy",
        type: "textarea",
      },
      {
        path: "contentAndLegal.responsibleGamblingMessage",
        label: "Responsible gambling message",
        type: "textarea",
      },
      {
        path: "contentAndLegal.supportContactInfo",
        label: "Support contact info",
        type: "text",
      },
    ],
  },
];

export default function Settings() {
  const { data, isLoading, isError, error } = useAdminSettings();
  const updateSettings = useUpdateAdminSettings();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<AdminSettingsConfig | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [modalDraft, setModalDraft] = useState<AdminSettingsConfig | null>(
    null,
  );
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [manualEntryKey, setManualEntryKey] = useState<string | null>(null);
  const [setupStep, setSetupStep] = useState<1 | 2 | 3>(1);
  const [stepOneCompleted, setStepOneCompleted] = useState(false);
  const [stepOneSkipped, setStepOneSkipped] = useState(false);

  const openAuthenticatorInstallLink = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = userAgent.includes("android");
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const installUrl = isAndroid
      ? MICROSOFT_AUTHENTICATOR_ANDROID_URL
      : isIos
        ? MICROSOFT_AUTHENTICATOR_IOS_URL
        : MICROSOFT_AUTHENTICATOR_FALLBACK_URL;

    window.open(installUrl, "_blank", "noopener,noreferrer");
    setStepOneCompleted(true);
    setStepOneSkipped(false);
    setSetupStep(2);
  };

  const resetTwoFactorWizard = () => {
    setSetupStep(1);
    setStepOneCompleted(false);
    setStepOneSkipped(false);
    setSetupToken(null);
    setQrCodeDataUrl(null);
    setManualEntryKey(null);
    setTwoFactorCode("");
  };

  const adminTwoFactorStatusQuery = useQuery({
    queryKey: ["admin-2fa-status"],
    queryFn: async () => {
      const response = await api.get<AdminTwoFactorStatusResponse>(
        "/profile/admin-2fa/status",
      );
      return response.data;
    },
  });

  const startAdminTwoFactorSetup = useMutation({
    mutationFn: async () => {
      const response = await api.post<AdminTwoFactorSetupResponse>(
        "/profile/admin-2fa/setup",
      );
      return response.data;
    },
    onSuccess: (payload) => {
      setSetupToken(payload.setupToken);
      setQrCodeDataUrl(payload.qrCodeDataUrl);
      setManualEntryKey(payload.manualEntryKey);
      setTwoFactorCode("");
      setSetupStep(3);
      toast.success(payload.message);
    },
    onError: (mutationError: unknown) => {
      const message =
        typeof mutationError === "object" &&
        mutationError !== null &&
        "response" in mutationError &&
        typeof (mutationError as { response?: unknown }).response === "object"
          ? ((mutationError as { response?: { data?: { message?: string } } })
              .response?.data?.message ?? "Failed to start 2FA setup.")
          : "Failed to start 2FA setup.";
      toast.error(message);
    },
  });

  const enableAdminTwoFactor = useMutation({
    mutationFn: async () => {
      if (!setupToken) {
        throw new Error("Start setup first.");
      }

      await api.post("/profile/admin-2fa/enable", {
        setupToken,
        otpCode: twoFactorCode.trim(),
      });
    },
    onSuccess: () => {
      toast.success("2FA enabled successfully.");
      resetTwoFactorWizard();
      void queryClient.invalidateQueries({ queryKey: ["admin-2fa-status"] });
    },
    onError: (mutationError: unknown) => {
      const message =
        typeof mutationError === "object" &&
        mutationError !== null &&
        "response" in mutationError &&
        typeof (mutationError as { response?: unknown }).response === "object"
          ? ((mutationError as { response?: { data?: { message?: string } } })
              .response?.data?.message ?? "Failed to enable 2FA.")
          : "Failed to enable 2FA.";
      toast.error(message);
    },
  });

  const disableAdminTwoFactor = useMutation({
    mutationFn: async () => {
      await api.post("/profile/admin-2fa/disable", {
        otpCode: twoFactorCode.trim(),
      });
    },
    onSuccess: () => {
      toast.success("2FA disabled successfully.");
      resetTwoFactorWizard();
      void queryClient.invalidateQueries({ queryKey: ["admin-2fa-status"] });
    },
    onError: (mutationError: unknown) => {
      const message =
        typeof mutationError === "object" &&
        mutationError !== null &&
        "response" in mutationError &&
        typeof (mutationError as { response?: unknown }).response === "object"
          ? ((mutationError as { response?: { data?: { message?: string } } })
              .response?.data?.message ?? "Failed to disable 2FA.")
          : "Failed to disable 2FA.";
      toast.error(message);
    },
  });

  const sendAdminTwoFactorAppLink = useMutation({
    mutationFn: async () => {
      const response = await api.post<GenericMessageResponse>(
        "/profile/admin-2fa/send-app-link",
      );
      return response.data;
    },
    onSuccess: (payload) => {
      toast.success(payload.message);
      setStepOneCompleted(true);
      setStepOneSkipped(false);
      setSetupStep(2);
    },
    onError: (mutationError: unknown) => {
      const message =
        typeof mutationError === "object" &&
        mutationError !== null &&
        "response" in mutationError &&
        typeof (mutationError as { response?: unknown }).response === "object"
          ? ((mutationError as { response?: { data?: { message?: string } } })
              .response?.data?.message ??
            "Failed to send Microsoft Authenticator install link.")
          : "Failed to send Microsoft Authenticator install link.";
      toast.error(message);
    },
  });

  useEffect(() => {
    if (data?.config) {
      setDraft(cloneSettings(data.config));
    }
  }, [data?.config]);

  const selectedSection = useMemo(
    () =>
      sectionDefinitions.find((section) => section.id === activeSectionId) ??
      null,
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
      Operations: filteredSections.filter(
        (section) => section.group === "Operations",
      ),
      "Risk & Compliance": filteredSections.filter(
        (section) => section.group === "Risk & Compliance",
      ),
      Commercial: filteredSections.filter(
        (section) => section.group === "Commercial",
      ),
    };
  }, [filteredSections]);

  const modalHasChanges = useMemo(() => {
    if (!draft || !modalDraft) {
      return false;
    }

    return JSON.stringify(draft) !== JSON.stringify(modalDraft);
  }, [draft, modalDraft]);

  const modalStats = useMemo(() => {
    if (!selectedSection || !modalDraft) {
      return { filled: 0, total: 0, percent: 0 };
    }

    const total = selectedSection.fields.length;
    const filled = selectedSection.fields.reduce((acc, field) => {
      const value = getByPath(modalDraft, field.path);
      return acc + (hasValue(value) ? 1 : 0);
    }, 0);
    const percent = total > 0 ? Math.round((filled / total) * 100) : 0;

    return { filled, total, percent };
  }, [selectedSection, modalDraft]);

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

  const updateModalField = (
    field: FieldDefinition,
    rawValue: string | boolean,
  ) => {
    setModalDraft((current) => {
      if (!current) {
        return current;
      }

      const currentValue = getByPath(current, field.path);
      let nextValue: unknown = rawValue;

      if (field.type === "number") {
        nextValue = toNumber(
          String(rawValue),
          typeof currentValue === "number" ? currentValue : 0,
        );
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
          ? ((mutationError as { response?: { data?: { message?: string } } })
              .response?.data?.message ?? "Failed to update settings.")
          : "Failed to update settings.";
      toast.error(message);
    }
  };

  if (isLoading || !draft) {
    return (
      <AdminCard>
        <div className="flex min-h-65 items-center justify-center gap-2 text-admin-text-muted">
          <Loader2 size={18} className="animate-spin" />
          Loading settings...
        </div>
      </AdminCard>
    );
  }

  if (isError) {
    return (
      <AdminCard>
        <p className="text-sm font-semibold text-admin-red">
          Failed to load settings.
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
        title="Settings"
        subtitle="Centralized configuration for your betting platform operations"
      />

      <AdminCard className="border-admin-border/80 bg-[linear-gradient(90deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-admin-border bg-admin-surface px-3 py-1.5 text-xs text-admin-text-secondary">
            <Sparkles size={12} className="text-admin-accent" />
            <span>13 configuration modules</span>
          </div>
          <div className="relative w-full max-w-70">
            <Search
              size={13}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-muted"
            />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search modules"
              className="h-9 w-full rounded-full border border-admin-border bg-admin-surface pl-8 pr-3 text-xs text-admin-text-primary outline-none transition focus:border-admin-border-strong"
            />
          </div>
        </div>
      </AdminCard>

      <AdminCard className="border-admin-border bg-admin-card/95 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-admin-text-primary">
              Admin 2FA Security Wizard
            </h3>
            <p className="mt-1 text-xs text-admin-text-muted">
              Professional step-by-step setup with strict progression. You
              cannot reach the next step until the current one is complete.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-admin-border bg-admin-surface px-3 py-1.5 text-xs text-admin-text-secondary">
            <Shield size={12} className="text-admin-accent" />
            <span>
              {adminTwoFactorStatusQuery.data?.enabled
                ? "Protected"
                : "Not protected"}
            </span>
          </div>
        </div>

        {adminTwoFactorStatusQuery.data?.enabled ? (
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2 text-emerald-300">
                <ShieldCheck size={16} />
                <p className="text-sm font-semibold">
                  Authenticator protection is active
                </p>
              </div>
              <p className="text-xs text-admin-text-muted">
                Your admin account currently requires a TOTP code at sign-in.
                Enter a valid code below only if you intentionally want to
                disable this protection.
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-admin-text-muted">
                  Authenticator code
                </label>
                <input
                  value={twoFactorCode}
                  onChange={(event) =>
                    setTwoFactorCode(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit code"
                  className={inputClassName}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => void disableAdminTwoFactor.mutateAsync()}
                disabled={
                  disableAdminTwoFactor.isPending ||
                  twoFactorCode.trim().length !== 6
                }
                variant="outline"
                className="h-9"
              >
                {disableAdminTwoFactor.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Disabling...
                  </>
                ) : (
                  "Disable 2FA"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid gap-2 md:grid-cols-3">
              {[
                {
                  id: 1,
                  title: "Install App",
                  icon: <Mail size={14} />,
                  done: stepOneCompleted || stepOneSkipped,
                  active: setupStep === 1,
                },
                {
                  id: 2,
                  title: "Generate QR",
                  icon: <QrCode size={14} />,
                  done: Boolean(setupToken),
                  active: setupStep === 2,
                },
                {
                  id: 3,
                  title: "Verify & Enable",
                  icon: <CheckCircle2 size={14} />,
                  done: false,
                  active: setupStep === 3,
                },
              ].map((step) => (
                <div
                  key={step.id}
                  className={`rounded-xl border p-3 text-xs transition ${
                    step.active
                      ? "border-admin-border-strong bg-admin-surface"
                      : "border-admin-border bg-admin-surface/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 text-admin-text-secondary">
                      {step.icon}
                      <span>Step {step.id}</span>
                    </div>
                    {step.done ? (
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-emerald-300">
                        {step.id === 1 && stepOneSkipped ? "Skipped" : "Done"}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-admin-text-primary">
                    {step.title}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-3 rounded-xl border border-admin-border bg-admin-surface/40 p-4">
              {setupStep === 1 ? (
                <>
                  <div className="flex items-start gap-2 text-admin-text-secondary">
                    <Smartphone
                      size={16}
                      className="mt-0.5 text-admin-accent"
                    />
                    <p className="text-xs leading-5 text-admin-text-muted">
                      Step 1 of 3. Open the install link directly on this phone,
                      or optionally send install links to your email. If you
                      already have the app, skip this step and continue.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={openAuthenticatorInstallLink}
                      className="h-9"
                    >
                      Open install link on this phone
                    </Button>
                    <Button
                      onClick={() =>
                        void sendAdminTwoFactorAppLink.mutateAsync()
                      }
                      disabled={sendAdminTwoFactorAppLink.isPending}
                      variant="outline"
                      className="h-9"
                    >
                      {sendAdminTwoFactorAppLink.isPending ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Sending email...
                        </>
                      ) : (
                        "Send install links to email"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9"
                      onClick={() => {
                        setStepOneSkipped(true);
                        setStepOneCompleted(false);
                        setSetupStep(2);
                      }}
                    >
                      I already have the app
                    </Button>
                  </div>
                </>
              ) : null}

              {(stepOneCompleted || stepOneSkipped) && setupStep === 2 ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs leading-5 text-admin-text-muted">
                      Step 2 of 3. Generate your QR code and setup secret. You
                      will scan this in Microsoft Authenticator.
                    </p>
                    <Button
                      variant="outline"
                      className="h-8"
                      onClick={() => {
                        setSetupStep(1);
                        setStepOneCompleted(false);
                        setStepOneSkipped(false);
                        setSetupToken(null);
                        setQrCodeDataUrl(null);
                        setManualEntryKey(null);
                        setTwoFactorCode("");
                      }}
                    >
                      <ArrowLeft size={14} />
                      Back
                    </Button>
                  </div>
                  <Button
                    onClick={() => void startAdminTwoFactorSetup.mutateAsync()}
                    disabled={startAdminTwoFactorSetup.isPending}
                    className="h-9"
                  >
                    {startAdminTwoFactorSetup.isPending ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Generating QR...
                      </>
                    ) : (
                      "Generate setup QR"
                    )}
                  </Button>
                </>
              ) : null}

              {setupToken && setupStep === 3 ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs leading-5 text-admin-text-muted">
                      Step 3 of 3. Scan the QR code or use manual key, then
                      enter the current 6-digit code to activate 2FA.
                    </p>
                    <Button
                      variant="outline"
                      className="h-8"
                      onClick={() => {
                        setSetupStep(2);
                        setTwoFactorCode("");
                      }}
                    >
                      <ArrowLeft size={14} />
                      Back
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[auto,1fr]">
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="Admin 2FA setup QR"
                        className="h-44 w-44 rounded-lg border border-admin-border bg-white p-2"
                      />
                    ) : null}
                    <div className="space-y-3">
                      {manualEntryKey ? (
                        <p className="text-xs text-admin-text-muted break-all">
                          Manual key:{" "}
                          <span className="text-admin-text-primary">
                            {manualEntryKey}
                          </span>
                        </p>
                      ) : null}

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-[0.08em] text-admin-text-muted">
                          Authenticator code
                        </label>
                        <input
                          value={twoFactorCode}
                          onChange={(event) =>
                            setTwoFactorCode(
                              event.target.value.replace(/\D/g, "").slice(0, 6),
                            )
                          }
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="6-digit code"
                          className={inputClassName}
                        />
                      </div>

                      <Button
                        onClick={() => void enableAdminTwoFactor.mutateAsync()}
                        disabled={
                          enableAdminTwoFactor.isPending ||
                          twoFactorCode.trim().length !== 6
                        }
                        className="h-9"
                      >
                        {enableAdminTwoFactor.isPending ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Enabling...
                          </>
                        ) : (
                          "Verify & enable 2FA"
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </AdminCard>

      {(
        Object.entries(grouped) as Array<
          [
            "System" | "Operations" | "Risk & Compliance" | "Commercial",
            SectionDefinition[],
          ]
        >
      ).map(([groupName, sections]) =>
        sections.length === 0 ? null : (
          <section key={groupName} className="space-y-3">
            <h2 className="text-lg font-semibold text-admin-text-primary">
              {groupName}
            </h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {sections.map((section) => (
                <AdminCard
                  key={section.id}
                  className="border-admin-border bg-admin-card/95 p-4 transition hover:border-admin-border-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-admin-text-primary">
                        {section.title}
                      </p>
                      <p className="text-xs leading-5 text-admin-text-muted">
                        {section.subtitle}
                      </p>
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

      <Dialog
        open={Boolean(selectedSection)}
        onOpenChange={(open) => (!open ? closeModal() : null)}
      >
        <DialogContent className="border-admin-border bg-admin-card p-5 sm:max-w-5xl max-h-[90vh] flex flex-col">
          {selectedSection && modalDraft ? (
            <>
              <DialogHeader className="rounded-2xl border border-admin-border bg-[linear-gradient(145deg,var(--color-bg-hover),transparent)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <DialogTitle className="text-admin-text-primary">
                      {selectedSection.title}
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-admin-text-muted">
                      {selectedSection.subtitle}
                    </DialogDescription>
                  </div>
                  <div className="rounded-xl border border-admin-border bg-admin-surface px-3 py-1 text-xs text-admin-text-secondary">
                    {modalStats.filled}/{modalStats.total} fields configured
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="h-2 w-45 overflow-hidden rounded-full bg-admin-surface">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--admin-accent),var(--admin-blue))]"
                      style={{ width: `${modalStats.percent}%` }}
                    />
                  </div>
                  <span className="text-xs text-admin-text-muted">
                    {modalStats.percent}% complete
                  </span>
                  <span
                    className={`ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      modalHasChanges
                        ? "bg-admin-gold-dim text-admin-gold"
                        : "bg-admin-live-dim text-admin-live"
                    }`}
                  >
                    {modalHasChanges ? (
                      <AlertTriangle size={12} />
                    ) : (
                      <CheckCircle2 size={12} />
                    )}
                    {modalHasChanges ? "Unsaved changes" : "All changes saved"}
                  </span>
                </div>
              </DialogHeader>

              <div className="grid gap-3 px-1 overflow-y-auto flex-1">
                <AdminCardHeader
                  title="Configuration Fields"
                  subtitle="Review and update values below"
                />

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {selectedSection.fields.map((field) => {
                    const value = getByPath(modalDraft, field.path);
                    const fullWidth =
                      field.type === "textarea" || field.type === "list";

                    return (
                      <label
                        key={field.path}
                        className={`space-y-1.5 rounded-xl border border-admin-border bg-admin-surface/40 p-3 ${
                          fullWidth ? "md:col-span-2" : ""
                        }`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-admin-text-muted">
                          {field.label}
                        </p>

                        {field.type === "text" && (
                          <input
                            className={inputClassName}
                            value={String(value ?? "")}
                            onChange={(event) =>
                              updateModalField(field, event.target.value)
                            }
                          />
                        )}

                        {field.type === "number" && (
                          <input
                            className={inputClassName}
                            type="number"
                            value={String(value ?? 0)}
                            onChange={(event) =>
                              updateModalField(field, event.target.value)
                            }
                          />
                        )}

                        {field.type === "textarea" && (
                          <textarea
                            className={textareaClassName}
                            rows={4}
                            value={String(value ?? "")}
                            onChange={(event) =>
                              updateModalField(field, event.target.value)
                            }
                          />
                        )}

                        {field.type === "select" && (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {(field.options ?? []).map((option) => {
                              const checked =
                                String(value ?? "") === option.value;

                              return (
                                <label
                                  key={option.value}
                                  className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${
                                    checked
                                      ? "border-admin-gold bg-admin-gold-dim text-admin-gold"
                                      : "border-admin-border bg-admin-surface text-admin-text-secondary hover:border-admin-border-strong"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={field.path}
                                    value={option.value}
                                    checked={checked}
                                    onChange={(event) =>
                                      updateModalField(
                                        field,
                                        event.target.value,
                                      )
                                    }
                                    className="sr-only"
                                  />
                                  <span className="flex items-center gap-2">
                                    <span
                                      className={`h-3 w-3 rounded-full border ${
                                        checked
                                          ? "border-admin-gold bg-admin-gold"
                                          : "border-admin-border"
                                      }`}
                                    />
                                    {option.label}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {field.type === "switch" && (
                          <div className="flex h-10 items-center justify-between rounded-lg border border-admin-border bg-admin-surface px-3">
                            <span className="text-sm text-admin-text-secondary">
                              {Boolean(value) ? "Enabled" : "Disabled"}
                            </span>
                            <Switch
                              checked={Boolean(value)}
                              onCheckedChange={(checked) =>
                                updateModalField(field, checked)
                              }
                            />
                          </div>
                        )}

                        {field.type === "list" && (
                          <textarea
                            className={textareaClassName}
                            rows={3}
                            value={Array.isArray(value) ? value.join("\n") : ""}
                            onChange={(event) =>
                              updateModalField(field, event.target.value)
                            }
                          />
                        )}

                        {field.hint ? (
                          <p className="text-[11px] text-admin-text-muted">
                            {field.hint}
                          </p>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  onClick={closeModal}
                  disabled={updateSettings.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void saveSection()}
                  disabled={updateSettings.isPending || !modalHasChanges}
                >
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
