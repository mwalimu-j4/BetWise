import { useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  QrCode,
  Mail,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  Lock,
  Copy,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/api/axiosConfig";
import { Button } from "@/components/ui/button";
import {
  AdminCard,
  AdminSectionHeader,
  AdminCardHeader,
} from "../../components/ui";
import { cn } from "@/lib/utils";

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

const MICROSOFT_AUTHENTICATOR_ANDROID_URL =
  "https://play.google.com/store/apps/details?id=com.azure.authenticator";
const MICROSOFT_AUTHENTICATOR_IOS_URL =
  "https://apps.apple.com/app/microsoft-authenticator/id983156458";
const MICROSOFT_AUTHENTICATOR_FALLBACK_URL =
  "https://www.microsoft.com/security/mobile-authenticator-app";

export default function SecurityWizard() {
  const queryClient = useQueryClient();
  const [setupStep, setSetupStep] = useState<1 | 2 | 3>(1);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [manualEntryKey, setManualEntryKey] = useState<string | null>(null);
  const [stepOneCompleted, setStepOneCompleted] = useState(false);

  const statusQuery = useQuery({
    queryKey: ["admin-2fa-status"],
    queryFn: async () => {
      const response = await api.get<AdminTwoFactorStatusResponse>(
        "/profile/admin-2fa/status",
      );
      return response.data;
    },
  });

  const startSetup = useMutation({
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
    onError: (error: any) => {
      toast.error(error.response?.data?.message ?? "Failed to start setup");
    },
  });

  const sendAppLink = useMutation({
    mutationFn: async () => {
      const response = await api.post<GenericMessageResponse>(
        "/profile/admin-2fa/send-app-link",
      );
      return response.data;
    },
    onSuccess: (payload) => {
      toast.success(payload.message);
      setStepOneCompleted(true);
      setSetupStep(2);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message ?? "Failed to send app link");
    },
  });

  const enable2FA = useMutation({
    mutationFn: async () => {
      if (!setupToken) throw new Error("Missing setup token");
      await api.post("/profile/admin-2fa/enable", {
        setupToken,
        otpCode: twoFactorCode.trim(),
      });
    },
    onSuccess: () => {
      toast.success("2FA enabled successfully");
      void queryClient.invalidateQueries({ queryKey: ["admin-2fa-status"] });
      setSetupStep(1);
      setSetupToken(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message ?? "Verification failed");
    },
  });

  const disable2FA = useMutation({
    mutationFn: async () => {
      await api.post("/profile/admin-2fa/disable", {
        otpCode: twoFactorCode.trim(),
      });
    },
    onSuccess: () => {
      toast.success("2FA disabled successfully");
      void queryClient.invalidateQueries({ queryKey: ["admin-2fa-status"] });
      setTwoFactorCode("");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message ?? "Failed to disable 2FA");
    },
  });

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success("Key copied to clipboard");
  };

  const openInstallLink = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = userAgent.includes("android");
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const url = isAndroid
      ? MICROSOFT_AUTHENTICATOR_ANDROID_URL
      : isIos
      ? MICROSOFT_AUTHENTICATOR_IOS_URL
      : MICROSOFT_AUTHENTICATOR_FALLBACK_URL;
    window.open(url, "_blank");
    setSetupStep(2);
    setStepOneCompleted(true);
  };

  if (statusQuery.isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-admin-accent" />
      </div>
    );
  }

  const isEnabled = statusQuery.data?.enabled;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AdminSectionHeader
        title="Security Center"
        subtitle="Protect your administrative account with mandatory two-factor authentication"
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Management & Status */}
        <div className="lg:col-span-4 space-y-6">
          <AdminCard className="overflow-hidden border-admin-border/60 bg-[linear-gradient(135deg,rgba(245,197,24,0.05)_0%,rgba(0,0,0,0)_100%)]">
            <div className="p-6">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-admin-accent/10 text-admin-accent">
                <Shield size={32} />
              </div>
              <h3 className="text-lg font-bold text-admin-text-primary">
                Account Protection
              </h3>
              <p className="mt-2 text-sm text-admin-text-muted leading-relaxed">
                TOTP-based authentication adds an extra layer of security by
                requiring a unique code from your mobile device.
              </p>

              <div className="mt-8 space-y-4">
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-4 transition-all duration-300",
                    isEnabled
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.05)]"
                      : "border-admin-red/30 bg-admin-red/5 text-admin-red shadow-[0_0_20px_rgba(239,68,68,0.05)]"
                  )}
                >
                  {isEnabled ? (
                    <ShieldCheck size={24} className="shrink-0" />
                  ) : (
                    <ShieldAlert size={24} className="shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider">
                      {isEnabled ? "Active" : "Inactive"}
                    </p>
                    <p className="text-[11px] opacity-80">
                      Current Status
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </AdminCard>

          {isEnabled && (
            <AdminCard className="border-admin-border/50 bg-admin-card/50 backdrop-blur-md">
              <AdminCardHeader
                title="Disable Protection"
                subtitle="Enter your current code to remove 2FA"
              />
              <div className="p-5 pt-0 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-admin-text-muted">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="h-12 w-full rounded-xl border border-admin-border bg-admin-bg/50 px-4 text-center text-xl font-bold tracking-[0.5em] text-admin-text-primary outline-none focus:border-admin-accent/50 focus:ring-4 focus:ring-admin-accent/10"
                  />
                </div>
                <Button
                  onClick={() => void disable2FA.mutateAsync()}
                  disabled={disable2FA.isPending || twoFactorCode.length !== 6}
                  variant="outline"
                  className="w-full border-admin-red/20 text-admin-red hover:bg-admin-red/10"
                >
                  {disable2FA.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Disable TOTP"
                  )}
                </Button>
              </div>
            </AdminCard>
          )}
        </div>

        {/* Right Column: Setup Wizard */}
        <div className="lg:col-span-8">
          {!isEnabled ? (
            <AdminCard className="h-full border-admin-border/80 bg-admin-card/95 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col h-full">
                {/* Wizard Header */}
                <div className="px-8 py-6 border-b border-admin-border/50">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-admin-text-primary">
                        Setup Wizard
                      </h3>
                      <p className="mt-1 text-sm text-admin-text-muted">
                        Secure your account in three easy steps
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3].map((step) => (
                        <div
                          key={step}
                          className={cn(
                            "h-1.5 w-8 rounded-full transition-all duration-500",
                            setupStep >= step
                              ? "bg-admin-accent shadow-[0_0_8px_rgba(245,197,24,0.4)]"
                              : "bg-admin-border/50"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Wizard Steps */}
                <div className="flex-1 p-8">
                  {setupStep === 1 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-400">
                          <Smartphone size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-admin-text-primary">
                            Step 1: Get the App
                          </h4>
                          <p className="text-sm text-admin-text-muted">
                            Install Microsoft Authenticator on your mobile device
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <button
                          onClick={openInstallLink}
                          className="group flex flex-col items-start p-6 rounded-2xl border border-admin-border bg-admin-surface/50 hover:bg-admin-accent/5 hover:border-admin-accent/30 transition-all text-left"
                        >
                          <div className="mb-4 rounded-xl bg-admin-bg p-2 text-admin-text-muted group-hover:text-admin-accent transition-colors">
                            <ArrowRight size={20} />
                          </div>
                          <span className="font-bold text-admin-text-primary">
                            Manual Install
                          </span>
                          <span className="text-xs text-admin-text-muted mt-1 leading-relaxed">
                            Open the App Store or Play Store directly from your browser.
                          </span>
                        </button>

                        <button
                          onClick={() => void sendAppLink.mutateAsync()}
                          disabled={sendAppLink.isPending}
                          className="group flex flex-col items-start p-6 rounded-2xl border border-admin-border bg-admin-surface/50 hover:bg-admin-accent/5 hover:border-admin-accent/30 transition-all text-left"
                        >
                          <div className="mb-4 rounded-xl bg-admin-bg p-2 text-admin-text-muted group-hover:text-admin-accent transition-colors">
                            {sendAppLink.isPending ? (
                              <Loader2 size={20} className="animate-spin" />
                            ) : (
                              <Mail size={20} />
                            )}
                          </div>
                          <span className="font-bold text-admin-text-primary">
                            Email Me Links
                          </span>
                          <span className="text-xs text-admin-text-muted mt-1 leading-relaxed">
                            We'll send the download links directly to your inbox.
                          </span>
                        </button>
                      </div>

                      <div className="mt-8 flex justify-end">
                        <Button
                          variant="ghost"
                          onClick={() => setSetupStep(2)}
                          className="group text-admin-text-secondary hover:text-admin-text-primary"
                        >
                          Already have the app?
                          <ChevronRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {setupStep === 2 && (
                    <div className="flex flex-col items-center justify-center py-8 animate-in fade-in slide-in-from-right-4 duration-500">
                      <div className="mb-6 h-20 w-20 flex items-center justify-center rounded-3xl bg-admin-accent/10 text-admin-accent">
                        <QrCode size={40} />
                      </div>
                      <h4 className="text-lg font-bold text-admin-text-primary text-center">
                        Generate Configuration
                      </h4>
                      <p className="mt-2 text-sm text-admin-text-muted text-center max-w-md">
                        Click below to generate your unique secret key and QR
                        code. Do not share this with anyone.
                      </p>

                      <div className="mt-10 flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setSetupStep(1)}
                          className="h-12 px-6"
                        >
                          <ArrowLeft size={16} className="mr-2" />
                          Back
                        </Button>
                        <Button
                          onClick={() => void startSetup.mutateAsync()}
                          disabled={startSetup.isPending}
                          className="h-12 px-8"
                        >
                          {startSetup.isPending ? (
                            <Loader2 size={16} className="animate-spin mr-2" />
                          ) : (
                            <Sparkles size={16} className="mr-2" />
                          )}
                          Generate Code
                        </Button>
                      </div>
                    </div>
                  )}

                  {setupStep === 3 && setupToken && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                      <div className="grid gap-10 md:grid-cols-2">
                        <div className="space-y-6">
                          <div>
                            <h4 className="font-bold text-admin-text-primary">
                              Step 3: Verify & Activate
                            </h4>
                            <p className="mt-1 text-sm text-admin-text-muted leading-relaxed">
                              Scan the code or manual enter the key, then enter
                              the 6-digit code to finalize.
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center justify-center rounded-3xl border-2 border-admin-border bg-white p-4 shadow-xl">
                            {qrCodeDataUrl ? (
                              <img
                                src={qrCodeDataUrl}
                                alt="TOTP QR"
                                className="h-44 w-44"
                              />
                            ) : (
                              <div className="h-44 w-44 grid place-items-center bg-admin-surface/20 rounded-2xl">
                                <Loader2 className="animate-spin text-admin-text-muted" />
                              </div>
                            )}
                          </div>

                          <div className="group relative overflow-hidden rounded-2xl border border-admin-border bg-admin-bg/30 p-4 transition-all hover:bg-admin-bg/50">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-admin-text-muted">
                              Manual Entry Key
                            </p>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="font-mono text-sm font-bold text-admin-text-primary break-all">
                                {manualEntryKey}
                              </span>
                              <button
                                onClick={() => copyToClipboard(manualEntryKey || "")}
                                className="ml-2 rounded-lg p-2 text-admin-text-muted hover:bg-admin-accent/10 hover:text-admin-accent transition-colors"
                              >
                                <Copy size={16} />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col justify-end space-y-6">
                          <div className="rounded-2xl border border-admin-border/60 bg-admin-surface/30 p-6">
                            <label className="mb-3 block text-sm font-bold text-admin-text-primary">
                              Enter Verification Code
                            </label>
                            <input
                              type="text"
                              maxLength={6}
                              value={twoFactorCode}
                              onChange={(e) =>
                                setTwoFactorCode(e.target.value.replace(/\D/g, ""))
                              }
                              placeholder="000 000"
                              className="h-14 w-full rounded-xl border border-admin-border bg-admin-bg/80 px-4 text-center text-2xl font-bold tracking-[0.4em] text-admin-accent outline-none focus:border-admin-accent focus:ring-4 focus:ring-admin-accent/5 backdrop-blur-sm"
                            />
                            <p className="mt-3 text-[11px] text-admin-text-muted text-center italic">
                              Codes expire every 30 seconds
                            </p>
                          </div>

                          <div className="flex gap-3">
                            <Button
                              variant="outline"
                              onClick={() => setSetupStep(2)}
                              className="h-12 flex-1"
                            >
                              <ArrowLeft size={16} className="mr-2" />
                              Reset
                            </Button>
                            <Button
                              onClick={() => void enable2FA.mutateAsync()}
                              disabled={enable2FA.isPending || twoFactorCode.length !== 6}
                              className="h-12 flex-1 shadow-lg shadow-admin-accent/20"
                            >
                              {enable2FA.isPending ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                "Enable Protection"
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </AdminCard>
          ) : (
            <AdminCard className="flex h-full flex-col items-center justify-center border-emerald-500/20 bg-emerald-500/5 p-12 text-center shadow-2xl shadow-emerald-500/5">
              <div className="relative mb-8">
                <div className="absolute inset-0 scale-150 blur-3xl opacity-20 bg-emerald-500 animate-pulse rounded-full" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 size={48} className="animate-in zoom-in-50 duration-500" />
                </div>
              </div>
              <h3 className="text-3xl font-black tracking-tight text-white">
                You're fully protected
              </h3>
              <p className="mt-4 max-w-md text-emerald-100/60 leading-relaxed">
                Your administrative account is secured with Two-Factor
                Authentication. All login attempts will require a verification
                code from your trusted device.
              </p>
              <div className="mt-10 flex gap-4">
                 <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300">
                   <Lock size={14} />
                   ENCRYPTED CONNECTION
                 </div>
              </div>
            </AdminCard>
          )}
        </div>
      </div>
    </div>
  );
}

function Sparkles({ size, className, ...props }: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("lucide lucide-sparkles", className)}
      {...props}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
