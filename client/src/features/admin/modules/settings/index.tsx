import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  ChevronRight,
  CreditCard,
  Loader2,
  Mail,
  Eye,
  EyeOff,
  Percent,
  Sparkles,
  Search,
  Shield,
  Smartphone,
  UserCog,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { api } from "@/api/axiosConfig";
import { useAuth } from "@/context/AuthContext";
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
      {
        path: "paymentsConfig.methods.mpesa",
        label: "Enable M-Pesa Gateway",
        type: "switch",
      },
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
      {
        path: "paymentsConfig.methods.paystack",
        label: "Enable Paystack Gateway",
        type: "switch",
      },
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
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [modalDraft, setModalDraft] = useState<AdminSettingsConfig | null>(
    null,
  );


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
      "Platform & Security": filteredSections.filter(
        (section) => section.group === "Platform & Security",
      ),
      "Financial Operations": filteredSections.filter(
        (section) => section.group === "Financial Operations",
      ),
      "Gambling Engine": filteredSections.filter(
        (section) => section.group === "Gambling Engine",
      ),
      "Growth & Legal": filteredSections.filter(
        (section) => section.group === "Growth & Legal",
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

    const dataFields = selectedSection.fields.filter((f) => f.type !== "header");
    const total = dataFields.length;
    const filled = dataFields.reduce((acc, field) => {
      const value = field.path ? getByPath(modalDraft, field.path) : undefined;
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

      <AdminCard className="border-admin-border/80 bg-[linear-gradient(90deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-admin-border bg-admin-surface px-3 py-1.5 text-xs text-admin-text-secondary">
            <Sparkles size={12} className="text-admin-accent" />
            <span>3 configuration modules</span>
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

      <AdminCard className="border-admin-border/50 bg-[linear-gradient(135deg,rgba(245,197,24,0.03)_0%,rgba(0,0,0,0)_100%)] p-4">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="group relative overflow-hidden rounded-[1.6rem] border border-admin-border bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] bg-admin-card/50 p-6 transition-all duration-300 hover:border-admin-accent/50 hover:bg-admin-accent/[0.03] hover:shadow-[0_12px_32px_-12px_rgba(245,197,24,0.15)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                       <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-admin-surface text-admin-accent transition-transform duration-300 group-hover:scale-110">
                        {section.icon}
                      </div>
                      <h4 className="text-sm font-bold tracking-tight text-admin-text-primary">
                        {section.title}
                      </h4>
                      <p className="text-xs leading-relaxed text-admin-text-muted/80 line-clamp-2">
                        {section.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-between border-t border-admin-border/50 pt-4">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1 w-1 rounded-full bg-admin-accent" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-admin-text-muted">
                        {section.fields.filter(f => f.type !== 'header').length} OPTIONS
                      </span>
                    </div>
                    <Button
                      onClick={() => openSectionModal(section.id)}
                      className="h-8 rounded-lg px-4 text-xs font-bold transition-all group-hover:bg-admin-accent group-hover:text-black"
                    >
                      Configure
                    </Button>
                  </div>
                </div>
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
                          className="md:col-span-2 pt-4 pb-2"
                        >
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-admin-accent/80">
                            {field.label}
                          </h4>
                          <div className="mt-2 h-px w-full bg-admin-border/40" />
                        </div>
                      );
                    }

                    return (
                      <label
                        key={field.path ?? `field-${index}`}
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
