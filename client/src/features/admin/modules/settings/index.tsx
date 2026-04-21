import { api } from "@/api/axiosConfig";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Lock,
  Percent,
  Shield,
  Smartphone,
  Sparkles,
  UserCog,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminCard, AdminSectionHeader } from "../../components/ui";
import {
  type AdminSettingsConfig,
  useAdminSettings,
  useUpdateAdminSettings,
} from "../../hooks/useAdminSettings";

type FieldType =
  | "text"
  | "number"
  | "textarea"
  | "switch"
  | "select"
  | "list"
  | "header";

type FieldDefinition = {
  path?: string;
  label: string;
  type: FieldType;
  hint?: string;
  options?: Array<{ label: string; value: string }>;
};

type SectionDefinition = {
  id: string;
  title: string;
  subtitle: string;
  group:
    | "Platform & Security"
    | "Financial Operations"
    | "Gambling Engine"
    | "Growth & Legal";
  icon: ReactNode;
  fields: FieldDefinition[];
};

type ChangePasswordResponse = {
  message: string;
  mustChangePassword: boolean;
};

type ChangePasswordErrorResponse = {
  message?: string;
  errors?: {
    currentPassword?: string[];
    newPassword?: string[];
    [key: string]: string[] | undefined;
  };
};

const inputClassName =
  "h-12 w-full rounded-xl border border-[#3d6ba3]/40 bg-[#0d2137]/60 px-4 text-sm text-white placeholder-[#a8c4e0] outline-none transition-all duration-200 hover:border-[#3d6ba3]/60 focus:border-[#f5c518]/70 focus:bg-[#1a3a6b]/40 focus:ring-4 focus:ring-[#f5c518]/10";
const textareaClassName =
  "w-full rounded-xl border border-[#3d6ba3]/40 bg-[#0d2137]/60 px-4 py-3 text-sm text-white placeholder-[#a8c4e0] outline-none transition-all duration-200 hover:border-[#3d6ba3]/60 focus:border-[#f5c518]/70 focus:bg-[#1a3a6b]/40 focus:ring-4 focus:ring-[#f5c518]/10";

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
    id: "user-defaults",
    title: "User Defaults & Restrictions",
    subtitle: "Wallet defaults, limits, and account verification rules",
    group: "Financial Operations",
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
    id: "mpesa",
    title: "M-Pesa Integration",
    subtitle: "STK Push, B2C transfers, and automated reconciliation",
    group: "Financial Operations",
    icon: <Smartphone size={16} />,
    fields: [
      { type: "header", label: "Api Configuration" },
      {
        path: "paymentsConfig.mpesa.shortcode",
        label: "Shortcode (Paybill/Till)",
        type: "text",
      },
      {
        path: "paymentsConfig.mpesa.consumerKey",
        label: "Consumer Key",
        type: "text",
      },
      {
        path: "paymentsConfig.mpesa.consumerSecret",
        label: "Consumer Secret",
        type: "text",
      },
      {
        path: "paymentsConfig.mpesa.passkey",
        label: "Online Passkey",
        type: "text",
      },
      { type: "header", label: "Operations" },
      {
        path: "paymentsConfig.mpesa.callbackUrl",
        label: "Result Callback URL",
        type: "text",
      },
      {
        path: "paymentsConfig.mpesa.transactionFeePercent",
        label: "Platform Fee (%)",
        type: "number",
      },
      {
        path: "paymentsConfig.mpesa.autoWithdrawEnabled",
        label: "Auto-approval for Withdrawals",
        type: "switch",
      },
      {
        path: "paymentsConfig.mpesa.mpesaWithdrawalApprovalThreshold",
        label: "Withdrawal Threshold",
        type: "number",
      },
    ],
  },
  {
    id: "paystack",
    title: "Paystack Gateway",
    subtitle: "Card payments, Apple Pay, and bank transfers via Paystack",
    group: "Financial Operations",
    icon: <CreditCard size={16} />,
    fields: [
      { type: "header", label: "API Credentials" },
      {
        path: "paymentsConfig.paystack.secretKey",
        label: "Live Secret Key",
        type: "text",
      },
      {
        path: "paymentsConfig.paystack.publicKey",
        label: "Live Public Key",
        type: "text",
      },
      { type: "header", label: "Webhooks & Callbacks" },
      {
        path: "paymentsConfig.paystack.webhookSecret",
        label: "Webhook Secret (Signing Key)",
        type: "text",
      },
      {
        path: "paymentsConfig.paystack.callbackUrl",
        label: "Merchant Callback URL",
        type: "text",
      },
      {
        path: "paymentsConfig.paystack.webhookUrl",
        label: "Webhook URL",
        type: "text",
      },
    ],
  },
  {
    id: "tax",
    title: "Tax & Financial Rules",
    subtitle: "Taxation, commissions, and rounding policy",
    group: "Financial Operations",
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
];

export default function Settings() {
  const { user, refreshSession } = useAuth();
  const navigate = useNavigate();
  const mustChangePassword = user?.mustChangePassword === true;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(
    null,
  );

  const { data, isLoading, isError, error } = useAdminSettings({
    enabled: !mustChangePassword,
  });
  const updateSettings = useUpdateAdminSettings();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<AdminSettingsConfig | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [modalDraft, setModalDraft] = useState<AdminSettingsConfig | null>(
    null,
  );

  useEffect(() => {
    if (data?.config) {
      setDraft(cloneSettings(data.config));
    }
  }, [data?.config]);

  const isGatewayValidated = (
    config: AdminSettingsConfig,
    gatewayId: string,
  ) => {
    if (gatewayId === "mpesa") {
      const { shortcode, consumerKey, consumerSecret, passkey, callbackUrl } =
        config.paymentsConfig.mpesa;
      return Boolean(
        shortcode && consumerKey && consumerSecret && passkey && callbackUrl,
      );
    }
    if (gatewayId === "paystack") {
      const { secretKey, publicKey, webhookSecret, callbackUrl, webhookUrl } =
        config.paymentsConfig.paystack;
      return Boolean(
        secretKey && publicKey && webhookSecret && callbackUrl && webhookUrl,
      );
    }
    return true;
  };

  const selectedSection = useMemo(
    () =>
      sectionDefinitions.find((section) => section.id === activeSectionId) ??
      null,
    [activeSectionId],
  );

  const grouped = useMemo(() => {
    return {
      "Platform & Security": sectionDefinitions.filter(
        (section) => section.group === "Platform & Security",
      ),
      "Financial Operations": sectionDefinitions.filter(
        (section) => section.group === "Financial Operations",
      ),
      "Gambling Engine": sectionDefinitions.filter(
        (section) => section.group === "Gambling Engine",
      ),
      "Growth & Legal": sectionDefinitions.filter(
        (section) => section.group === "Growth & Legal",
      ),
    };
  }, []);

  const modalHasChanges = useMemo(() => {
    if (!draft || !modalDraft) {
      return false;
    }

    return JSON.stringify(draft) !== JSON.stringify(modalDraft);
  }, [draft, modalDraft]);

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
    if (!field.path) {
      return;
    }

    const path = field.path;

    setModalDraft((current) => {
      if (!current) {
        return current;
      }

      const currentValue = getByPath(current, path);
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

      return setByPath(current, path, nextValue);
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

  const handleForcePasswordChange = async () => {
    setPasswordChangeError(null);

    if (!currentPassword.trim() || !newPassword.trim()) {
      const message = "Current password and new password are required.";
      setPasswordChangeError(message);
      toast.error(message);
      return;
    }

    if (newPassword !== confirmPassword) {
      const message = "New password and confirm password must match.";
      setPasswordChangeError(message);
      toast.error(message);
      return;
    }

    if (newPassword.length < 10) {
      const message = "New password must be at least 10 characters long.";
      setPasswordChangeError(message);
      toast.error(message);
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      const message =
        "New password must include at least one uppercase letter.";
      setPasswordChangeError(message);
      toast.error(message);
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      const message =
        "New password must include at least one lowercase letter.";
      setPasswordChangeError(message);
      toast.error(message);
      return;
    }

    if (!/\d/.test(newPassword)) {
      const message = "New password must include at least one number.";
      setPasswordChangeError(message);
      toast.error(message);
      return;
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      const message =
        "New password must include at least one special character.";
      setPasswordChangeError(message);
      toast.error(message);
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await api.post<ChangePasswordResponse>(
        "/auth/change-password",
        {
          currentPassword,
          newPassword,
        },
      );

      toast.success(response.data.message || "Password changed successfully.");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordChangeError(null);

      await refreshSession();
      await queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      await navigate({ to: "/admin" });
    } catch (mutationError: unknown) {
      const responseData =
        typeof mutationError === "object" &&
        mutationError !== null &&
        "response" in mutationError &&
        typeof (mutationError as { response?: unknown }).response === "object"
          ? (
              mutationError as {
                response?: { data?: ChangePasswordErrorResponse };
              }
            ).response?.data
          : undefined;

      const messageFromFieldErrors = responseData?.errors
        ? Object.values(responseData.errors)
            .flatMap((entries) => entries ?? [])
            .find(
              (entry) => typeof entry === "string" && entry.trim().length > 0,
            )
        : undefined;

      const message =
        messageFromFieldErrors ??
        responseData?.message ??
        "Failed to change password.";

      setPasswordChangeError(message);
      toast.error(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (mustChangePassword) {
    return (
      <div className="space-y-6">
        <AdminSectionHeader
          title="Settings"
          subtitle="Complete your first-time password update to unlock admin tools"
        />

        <AdminCard className="border-amber-500/30 bg-amber-500/5 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 text-amber-300" />
            <div>
              <p className="text-sm font-semibold text-amber-200">
                Password change required
              </p>
              <p className="mt-1 text-xs text-admin-text-muted">
                This account uses a temporary password. Update it now to unlock
                all admin resources.
              </p>
            </div>
          </div>

          {passwordChangeError ? (
            <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {passwordChangeError}
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="space-y-1.5 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-admin-text-muted">
                Current password
              </p>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  className={`${inputClassName} pr-11`}
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-text-muted transition hover:text-admin-text-primary"
                  aria-label={
                    showCurrentPassword
                      ? "Hide current password"
                      : "Show current password"
                  }
                >
                  {showCurrentPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </label>

            <label className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-admin-text-muted">
                New password
              </p>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  className={`${inputClassName} pr-11`}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-text-muted transition hover:text-admin-text-primary"
                  aria-label={
                    showNewPassword ? "Hide new password" : "Show new password"
                  }
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <label className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-admin-text-muted">
                Confirm new password
              </p>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className={`${inputClassName} pr-11`}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-text-muted transition hover:text-admin-text-primary"
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </label>
          </div>

          <p className="mt-3 text-xs text-admin-text-muted">
            Password must be at least 10 characters and include uppercase,
            lowercase, number, and special character.
          </p>

          <div className="mt-5 flex justify-end">
            <Button
              onClick={() => void handleForcePasswordChange()}
              disabled={
                isChangingPassword ||
                !currentPassword.trim() ||
                !newPassword.trim() ||
                !confirmPassword.trim()
              }
              className="w-full sm:w-auto"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Updating password...
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </div>
        </AdminCard>
      </div>
    );
  }

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

      <AdminCard className="border-admin-border/50 bg-[#0b1426]/60 p-5 shadow-lg shadow-black/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-admin-accent/10 text-admin-accent">
              <Shield size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-admin-text-primary">
                Security & Access Control
              </h3>
              <p className="mt-0.5 text-xs text-admin-text-muted">
                Manage administrative security protocols and multi-factor
                authentication.
              </p>
            </div>
          </div>
          <Button
            onClick={() => void navigate({ to: "/admin/security" })}
            className="h-10 px-5 gap-2 shadow-lg shadow-admin-accent/10"
          >
            Launch Security Wizard
            <ChevronRight size={14} />
          </Button>
        </div>
      </AdminCard>

      {(
        Object.entries(grouped) as Array<
          [
            (
              | "Platform & Security"
              | "Financial Operations"
              | "Gambling Engine"
              | "Growth & Legal"
            ),
            SectionDefinition[],
          ]
        >
      ).map(([groupName, sections]) =>
        sections.length === 0 ? null : (
          <section key={groupName} className="space-y-3">
            <h2 className="text-lg font-semibold text-admin-text-primary">
              {groupName}
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sections.map((section) => {
                const isGateway =
                  section.id === "mpesa" || section.id === "paystack";
                const gatewayPath = isGateway
                  ? section.id === "mpesa"
                    ? "paymentsConfig.methods.mpesa"
                    : "paymentsConfig.methods.paystack"
                  : null;
                const isEnabled = gatewayPath
                  ? Boolean(getByPath(draft, gatewayPath))
                  : false;

                return (
                  <div
                    key={section.id}
                    className="group relative overflow-hidden rounded-[2rem] border border-[#3d6ba3]/30 bg-[#0d2137] p-7 transition-all duration-500 hover:border-[#f5c518]/40 hover:shadow-[0_20px_50px_-12px_rgba(245,197,24,0.15)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5c518]/10 text-[#f5c518] shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                          {section.icon}
                        </div>
                        <h4 className="text-base font-bold tracking-tight text-white">
                          {section.title}
                        </h4>
                        <p className="text-xs leading-relaxed text-[#a8c4e0]/80 line-clamp-2">
                          {section.subtitle}
                        </p>
                      </div>

                      {isGateway && (
                        <div className="flex flex-col items-end gap-2">
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                const isValidated = isGatewayValidated(
                                  draft,
                                  section.id,
                                );
                                if (!isValidated) {
                                  toast.error(
                                    `Please complete ${section.title} configuration before activating.`,
                                  );
                                  return;
                                }
                              }
                              if (gatewayPath) {
                                const updated = setByPath(
                                  draft,
                                  gatewayPath,
                                  checked,
                                );
                                setDraft(updated);
                                void updateSettings.mutateAsync(updated);
                              }
                            }}
                            className="data-[state=checked]:bg-[#f5c518]"
                          />
                          <span
                            className={cn(
                              "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg border",
                              isGatewayValidated(draft, section.id)
                                ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/5"
                                : "text-amber-400 border-amber-400/20 bg-amber-400/5",
                            )}
                          >
                            {isGatewayValidated(draft, section.id)
                              ? "Ready"
                              : "Pending Details"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-10 flex items-center justify-between border-t border-[#3d6ba3]/20 pt-5">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            isGateway
                              ? isEnabled
                                ? "bg-emerald-400"
                                : "bg-red-400"
                              : "bg-[#f5c518]",
                          )}
                        />
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#a8c4e0]">
                          {
                            section.fields.filter((f) => f.type !== "header")
                              .length
                          }{" "}
                          CONFIG FIELDS
                        </span>
                      </div>
                      <Button
                        onClick={() => openSectionModal(section.id)}
                        className="h-9 rounded-xl px-5 text-xs font-bold transition-all bg-[#f5c518] text-[#0d2137] hover:bg-[#e6b800] hover:scale-105 active:scale-95"
                      >
                        Configure
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ),
      )}

      <Dialog
        open={Boolean(selectedSection)}
        onOpenChange={(open) => (!open ? closeModal() : null)}
      >
        <DialogContent className="border-[#3d6ba3]/40 bg-[#0b1426] p-0 sm:max-w-5xl h-[90vh] max-h-[90vh] overflow-hidden rounded-[3rem] shadow-[0_0_120px_rgba(0,0,0,0.85)]">
          {selectedSection && modalDraft ? (
            <div className="flex flex-col h-full min-h-0">
              {/* Header */}
              <div className="px-10 py-8 border-b border-[#3d6ba3]/20 bg-black/20 backdrop-blur-md">
                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5c518] text-[#0d2137] shadow-lg shadow-[#f5c518]/20">
                      {selectedSection.icon}
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-bold tracking-tight text-white">
                        {selectedSection.title}
                      </DialogTitle>
                      <DialogDescription className="mt-1 text-sm text-[#a8c4e0]">
                        {selectedSection.subtitle}
                      </DialogDescription>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-4 py-2 transition-all duration-500",
                      modalHasChanges
                        ? "border-[#f5c518]/30 bg-[#f5c518]/5 text-[#f5c518]"
                        : "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
                    )}
                  >
                    {modalHasChanges ? (
                      <AlertTriangle size={14} />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {modalHasChanges ? "Unsaved Progress" : "System Synced"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-10 py-10 app-scrollbar pr-6">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  {selectedSection.fields.map((field, index) => {
                    const value = field.path
                      ? getByPath(modalDraft, field.path)
                      : undefined;
                    const fullWidth =
                      field.type === "textarea" ||
                      field.type === "list" ||
                      field.type === "header";

                    if (field.type === "header") {
                      return (
                        <div
                          key={`header-${index}`}
                          className="md:col-span-2 mt-4 flex items-center gap-4"
                        >
                          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#f5c518]/80 whitespace-nowrap">
                            {field.label}
                          </span>
                          <div className="h-px w-full bg-linear-to-r from-[#3d6ba3]/40 to-transparent" />
                        </div>
                      );
                    }

                    // Field Icons Mapping
                    let FieldIcon = Sparkles;
                    if (
                      field.label.toLowerCase().includes("key") ||
                      field.label.toLowerCase().includes("secret") ||
                      field.label.toLowerCase().includes("passkey")
                    )
                      FieldIcon = Lock;
                    else if (field.label.toLowerCase().includes("url"))
                      FieldIcon = Globe;
                    else if (
                      field.label.toLowerCase().includes("fee") ||
                      field.label.toLowerCase().includes("tax")
                    )
                      FieldIcon = Percent;
                    else if (field.label.toLowerCase().includes("shortcode"))
                      FieldIcon = Zap;

                    return (
                      <div
                        key={field.path ?? `field-${index}`}
                        className={cn(
                          "space-y-2.5",
                          fullWidth ? "md:col-span-2" : "",
                        )}
                      >
                        <div className="flex items-center gap-2 ml-1">
                          <FieldIcon size={12} className="text-[#a8c4e0]/60" />
                          <p className="text-[11px] font-bold uppercase tracking-widest text-[#a8c4e0]/70">
                            {field.label}
                          </p>
                        </div>

                        <div className="relative group/field">
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
                            <div className="grid grid-cols-2 gap-3">
                              {(field.options ?? []).map((option) => {
                                const checked =
                                  String(value ?? "") === option.value;
                                return (
                                  <label
                                    key={option.value}
                                    className={cn(
                                      "cursor-pointer rounded-xl border px-4 py-3 text-sm font-bold transition-all duration-300 flex items-center justify-center gap-3",
                                      checked
                                        ? "border-[#f5c518] bg-[#f5c518]/10 text-[#f5c518] shadow-[0_0_15px_rgba(245,197,24,0.1)]"
                                        : "border-[#3d6ba3]/30 bg-[#0d2137]/40 text-[#a8c4e0] hover:border-[#3d6ba3]/60 hover:bg-[#1a3a6b]/20",
                                    )}
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
                                    {option.label}
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {field.type === "switch" && (
                            <div className="flex h-[3.2rem] items-center justify-between rounded-xl border border-[#3d6ba3]/30 bg-[#0d2137]/40 px-5">
                              <span className="text-sm font-medium text-[#a8c4e0]">
                                {Boolean(value)
                                  ? "Active Status"
                                  : "Inactive Status"}
                              </span>
                              <Switch
                                checked={Boolean(value)}
                                onCheckedChange={(checked) =>
                                  updateModalField(field, checked)
                                }
                                className="data-[state=checked]:bg-[#f5c518]"
                              />
                            </div>
                          )}

                          {field.type === "list" && (
                            <textarea
                              className={textareaClassName}
                              rows={3}
                              value={
                                Array.isArray(value) ? value.join("\n") : ""
                              }
                              onChange={(event) =>
                                updateModalField(field, event.target.value)
                              }
                            />
                          )}
                        </div>

                        {field.hint && (
                          <p className="ml-1 text-[10px] italic text-[#a8c4e0]/50">
                            * {field.hint}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 z-10 px-10 py-8 border-t border-[#3d6ba3]/20 bg-[#0b1426] flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={closeModal}
                  disabled={updateSettings.isPending}
                  className="h-12 px-8 rounded-2xl border-[#3d6ba3]/30 text-[#a8c4e0] hover:bg-white/5"
                >
                  Discard
                </Button>
                <Button
                  onClick={() => void saveSection()}
                  disabled={updateSettings.isPending || !modalHasChanges}
                  className="h-12 px-10 rounded-xl bg-[#f5c518] text-[#0d2137] font-bold shadow-xl shadow-[#f5c518]/10 hover:shadow-[#f5c518]/30 transition-all hover:scale-[1.02] active:scale-[0.98] hover:bg-[#e6b800]"
                >
                  {updateSettings.isPending ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    "Confirm Changes"
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
