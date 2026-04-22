import { useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Shield,
  ShieldCheck,
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
  AdminDialogContent,
} from "../../components/ui";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [setupStep, setSetupStep] = useState<1 | 2>(1);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [manualEntryKey, setManualEntryKey] = useState<string | null>(null);

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
      setIsQrModalOpen(true);
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
      setIsQrModalOpen(false);
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
    <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AdminSectionHeader
        title="Security Center"
        subtitle="Protect your administrative account with mandatory two-factor authentication"
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Information */}
        <div className="lg:col-span-4 space-y-6">
          <AdminCard className="overflow-hidden border-admin-border/50 bg-[#0b1426]/60 shadow-lg">
            <div className="p-6">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-admin-accent/10 text-admin-accent border border-admin-accent/20 shadow-[inset_0_0_15px_rgba(245,197,24,0.1)]">
                <Shield size={24} />
              </div>
              <h3 className="text-base font-bold text-admin-text-primary">
                Account Protection
              </h3>
              <p className="mt-2 text-xs text-admin-text-muted leading-relaxed">
                TOTP-based authentication adds an extra layer of security by
                requiring a unique code from your mobile device.
              </p>

              <div className="mt-6">
                 <div className={cn(
                   "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase",
                   isEnabled 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-admin-red/10 text-admin-red border border-admin-red/20"
                 )}>
                   <div className={cn("h-1.5 w-1.5 rounded-full", isEnabled ? "bg-emerald-400 animate-pulse" : "bg-admin-red")} />
                   {isEnabled ? "Protected" : "Vulnerable"}
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
              <div className="p-4 pt-0 space-y-4">
                <div className="space-y-1.5">
                  <input
                    type="text"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="h-10 w-full rounded-xl border border-admin-border bg-admin-bg/50 px-4 text-center text-lg font-bold tracking-[0.5em] text-admin-text-primary outline-none focus:border-admin-accent/50 focus:ring-4 focus:ring-admin-accent/10 transition-all"
                  />
                </div>
                <Button
                  onClick={() => void disable2FA.mutateAsync()}
                  disabled={disable2FA.isPending || twoFactorCode.length !== 6}
                  variant="outline"
                  className="w-full h-10 border-admin-red/20 text-admin-red hover:bg-admin-red/10 text-xs font-bold uppercase tracking-wider"
                >
                  {disable2FA.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
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
            <AdminCard className="p-0 h-full border-admin-border/50 bg-[#0b1426]/40 shadow-2xl backdrop-blur-xl rounded-3xl overflow-hidden">
              <div className="flex flex-col h-full">
                <div className="px-6 py-5 bg-gradient-to-br from-white/[0.03] to-transparent">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-admin-accent/10 text-admin-accent border border-admin-accent/20 shadow-[0_0_20px_rgba(245,197,24,0.1)]">
                        <Lock size={22} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold tracking-tight text-admin-text-primary">
                          Two-Factor Setup
                        </h3>
                        <p className="text-xs text-admin-text-muted mt-0.5">
                          Follow the steps to harden your account security
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-black/20 px-4 py-2 rounded-2xl border border-white/5">
                      <span className="text-[10px] font-bold text-admin-text-muted uppercase tracking-widest mr-2">Step {setupStep} of 2</span>
                      <div className="flex gap-1.5">
                        {[1, 2].map((step) => (
                          <div
                            key={step}
                            className={cn(
                              "h-1.5 w-6 rounded-full transition-all duration-500",
                              setupStep >= step
                                ? "bg-admin-accent shadow-[0_0_10px_rgba(245,197,24,0.4)]"
                                : "bg-white/10"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-8">
                  {setupStep === 1 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/10 text-indigo-400">
                          <Smartphone size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-admin-text-primary uppercase tracking-tight">
                            Step 1: Get the App
                          </h4>
                          <p className="text-xs text-admin-text-muted">
                            Install Microsoft Authenticator on your mobile device
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <button
                          onClick={openInstallLink}
                          className="group relative flex flex-col items-start p-6 rounded-2xl border border-white/5 bg-[#0d2137]/40 hover:bg-[#1a3a6b]/30 hover:border-[#f5c518]/30 transition-all duration-500 text-left shadow-lg overflow-hidden"
                        >
                          <div className="mb-4 rounded-xl bg-black/40 p-2 text-admin-text-muted group-hover:text-admin-accent transition-all duration-500">
                            <ArrowRight size={20} />
                          </div>
                          <span className="text-base font-bold tracking-tight text-admin-text-primary">
                            Manual Install
                          </span>
                          <span className="text-[10px] text-admin-text-muted mt-2 leading-relaxed opacity-70">
                            Open App Store or Play Store from your browser.
                          </span>
                        </button>

                        <button
                          onClick={() => void sendAppLink.mutateAsync()}
                          disabled={sendAppLink.isPending}
                          className="group relative flex flex-col items-start p-6 rounded-2xl border border-white/5 bg-[#0d2137]/40 hover:bg-[#1a3a6b]/30 hover:border-[#f5c518]/30 transition-all duration-500 text-left shadow-lg overflow-hidden"
                        >
                          <div className="mb-4 rounded-xl bg-black/40 p-2 text-admin-text-muted group-hover:text-admin-accent transition-all duration-500">
                            {sendAppLink.isPending ? (
                              <Loader2 size={20} className="animate-spin" />
                            ) : (
                              <Mail size={20} />
                            )}
                          </div>
                          <span className="text-base font-bold tracking-tight text-admin-text-primary">
                            Email Me Links
                          </span>
                          <span className="text-[10px] text-admin-text-muted mt-2 leading-relaxed opacity-70">
                            Receive download links in your inbox.
                          </span>
                        </button>
                      </div>

                      <div className="mt-8 flex justify-end">
                        <Button
                          variant="ghost"
                          onClick={() => setSetupStep(2)}
                          className="group text-xs text-admin-text-secondary hover:text-admin-text-primary"
                        >
                          Already have the app?
                          <ChevronRight size={14} className="ml-1 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {setupStep === 2 && (
                    <div className="flex flex-col items-center justify-center py-6 animate-in fade-in slide-in-from-right-4 duration-700">
                      <div className="relative mb-8">
                        <div className="absolute inset-0 scale-150 blur-3xl opacity-20 bg-[#f5c518] animate-pulse" />
                        <div className="relative h-20 w-20 flex items-center justify-center rounded-2xl bg-[#f5c518]/10 text-[#f5c518] border border-[#f5c518]/20 shadow-[inset_0_0_20px_rgba(245,197,24,0.1)]">
                          <QrCode size={36} />
                        </div>
                      </div>
                      <h4 className="text-lg font-bold tracking-tight text-admin-text-primary text-center">
                        Generate Configuration
                      </h4>
                      <p className="mt-3 text-xs text-admin-text-muted text-center max-w-xs leading-relaxed">
                        Securely initialize your authentication profile and generate your unique QR code.
                      </p>

                      <div className="mt-10 flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setSetupStep(1)}
                          className="h-12 px-8 rounded-xl border-white/10 hover:bg-white/5 active:scale-95 transition-all text-xs"
                        >
                          <ArrowLeft size={16} className="mr-2" />
                          Back
                        </Button>
                        <Button
                          onClick={() => void startSetup.mutateAsync()}
                          disabled={startSetup.isPending}
                          className="h-12 px-10 rounded-xl bg-[#f5c518] text-[#0d2137] font-bold shadow-xl shadow-[#f5c518]/20 hover:bg-[#e6b800] active:scale-95 transition-all text-xs uppercase tracking-wider"
                        >
                          {startSetup.isPending ? (
                            <Loader2 size={16} className="animate-spin mr-2" />
                          ) : (
                            <Sparkles size={16} className="mr-2" />
                          )}
                          Initialize Setup
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </AdminCard>
          ) : (
            <AdminCard className="flex h-full flex-col items-center justify-center border-emerald-500/10 bg-[#0b1426]/40 p-12 text-center shadow-2xl rounded-3xl overflow-hidden relative group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05),transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="relative mb-8">
                <div className="absolute inset-0 scale-150 blur-3xl opacity-30 bg-emerald-500 animate-pulse rounded-full" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[inset_0_0_30px_rgba(16,185,129,0.1)]">
                  <CheckCircle2 size={48} className="animate-in zoom-in-50 duration-700" />
                </div>
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-white">
                Protection Active
              </h3>
              <p className="mt-4 max-w-sm text-emerald-100/60 leading-relaxed text-xs">
                Your administrative gateway is now hardened with TOTP protection. All authentication requests require device verification.
              </p>
              <div className="mt-10 flex items-center gap-4">
                 <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-[9px] font-bold tracking-widest text-emerald-400 uppercase">
                   <Lock size={12} aria-hidden="true" />
                   ENCRYPTED
                 </div>
                 <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-[9px] font-bold tracking-widest text-emerald-400 uppercase">
                   <ShieldCheck size={12} aria-hidden="true" />
                   SECURE
                 </div>
              </div>
            </AdminCard>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <AdminDialogContent className="max-w-[95vw] sm:max-w-2xl p-0 overflow-hidden border-white/5">
           <DialogHeader className="p-6 pb-0 sm:p-8 sm:pb-0">
             <div className="flex items-center gap-3">
               <div className="p-2 rounded-lg bg-admin-accent/10 text-admin-accent">
                 <Shield size={20} />
               </div>
               <DialogTitle className="text-xl font-bold text-admin-text-primary">Final Activation</DialogTitle>
             </div>
             <p className="mt-2 text-sm text-admin-text-muted">Scan the token using your authenticator app to complete setup.</p>
           </DialogHeader>

           <div className="p-6 sm:p-8">
             <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
               <div className="space-y-6">
                 <div className="relative group mx-auto lg:mx-0 w-max">
                   <div className="absolute inset-0 bg-[#f5c518]/10 blur-2xl rounded-full scale-75 group-hover:scale-100 transition-transform duration-700" />
                   <div className="relative flex shrink-0 items-center justify-center rounded-2xl border-2 border-admin-accent/20 bg-white p-4 shadow-2xl">
                     {qrCodeDataUrl ? (
                       <img
                         src={qrCodeDataUrl}
                         alt="Secure TOTP Token"
                         className="h-44 w-44 sm:h-48 sm:w-48 transition-transform duration-500 group-hover:scale-105"
                       />
                     ) : (
                       <div className="h-48 w-48 grid place-items-center bg-admin-surface/20 rounded-2xl">
                         <Loader2 className="animate-spin text-admin-accent" />
                       </div>
                     )}
                   </div>
                 </div>

                 <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-black/40 p-4 transition-all hover:bg-black/60">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-admin-accent/80">
                     Security Key
                   </p>
                   <div className="mt-2 flex items-center justify-between gap-3">
                     <span className="font-mono text-xs font-medium text-admin-text-primary tracking-wider break-all bg-black/20 px-2 py-1 rounded">
                       {manualEntryKey}
                     </span>
                     <button
                       onClick={() => copyToClipboard(manualEntryKey || "")}
                       className="shrink-0 rounded-lg p-2.5 bg-white/5 text-admin-text-muted hover:bg-admin-accent/10 hover:text-admin-accent transition-all active:scale-90"
                     >
                       <Copy size={16} />
                     </button>
                   </div>
                 </div>
               </div>

               <div className="flex flex-col space-y-6">
                 <div className="rounded-2xl border border-white/5 bg-black/30 p-6 backdrop-blur-sm">
                   <label className="mb-4 block text-[10px] font-bold uppercase tracking-[0.2em] text-admin-accent">
                     Verification Token
                   </label>
                   <div className="relative">
                     <input
                       type="text"
                       maxLength={6}
                       value={twoFactorCode}
                       onChange={(e) =>
                         setTwoFactorCode(e.target.value.replace(/\D/g, ""))
                       }
                       placeholder="000000"
                       className="h-16 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-center text-3xl font-mono font-bold tracking-[0.2em] text-admin-accent outline-none focus:border-admin-accent/40 focus:ring-4 focus:ring-admin-accent/5 transition-all placeholder:opacity-20"
                     />
                   </div>
                   <p className="mt-4 text-[10px] text-admin-text-muted/60 text-center font-medium italic tracking-wide">
                     Refreshes every 30 seconds
                   </p>
                 </div>

                 <Button
                   onClick={() => void enable2FA.mutateAsync()}
                   disabled={enable2FA.isPending || twoFactorCode.length !== 6}
                   className="h-14 w-full rounded-xl bg-admin-accent text-admin-bg font-bold shadow-xl shadow-admin-accent/20 hover:bg-admin-accent-strong active:scale-95 transition-all uppercase tracking-[0.2em] text-xs"
                 >
                   {enable2FA.isPending ? (
                     <Loader2 size={18} className="animate-spin" />
                   ) : (
                     "Enable Protection"
                   )}
                 </Button>
                 
                 <p className="text-[10px] text-center text-admin-text-muted px-4 leading-relaxed">
                   Enter the 6-digit code from your authenticator app to verify your identity and activate protection.
                 </p>
               </div>
             </div>
           </div>
        </AdminDialogContent>
      </Dialog>
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
