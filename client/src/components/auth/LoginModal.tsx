import { useState, useMemo, useCallback, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { isAxiosError } from "axios";
import { Eye, EyeOff, Loader2, Lock, Phone, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const KENYAN_PHONE_REGEX = /^(\+?254|0)(7|1)\d{8}$/;

function normalizePhoneInput(value: string) {
  return value.replace(/[\s-]/g, "");
}

function getLoginErrorMessage(error: unknown) {
  if (isAxiosError<{ message?: string }>(error)) {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }

    if (!status) {
      return "Unable to reach server. Check your internet connection.";
    }
  }

  return "Invalid phone number or password.";
}

export default function LoginModal() {
  const { login, verifyAdminMfa, authModal, closeAuthModal, openAuthModal } =
    useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaMode, setMfaMode] = useState<"totp_setup" | "totp_verify" | null>(
    null,
  );
  const [mfaCode, setMfaCode] = useState("");
  const [mfaQrCodeDataUrl, setMfaQrCodeDataUrl] = useState<string | null>(null);
  const [mfaManualEntryKey, setMfaManualEntryKey] = useState<string | null>(
    null,
  );

  const formValid = useMemo(() => {
    return KENYAN_PHONE_REGEX.test(phone.trim()) && password.length > 0;
  }, [password.length, phone]);

  const handlePhoneChange = useCallback(
    (value: string) => {
      setPhone(normalizePhoneInput(value));
      if (errorMessage) setErrorMessage("");
    },
    [errorMessage],
  );

  const handlePasswordChange = useCallback(
    (value: string) => {
      setPassword(value);
      if (errorMessage) setErrorMessage("");
    },
    [errorMessage],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mfaToken && !/^\d{6}$/.test(mfaCode.trim())) {
      setErrorMessage("Enter the 6-digit code from Microsoft Authenticator.");
      return;
    }

    if (!mfaToken && !formValid) {
      setErrorMessage("Enter a valid Kenyan phone number and password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      if (mfaToken) {
        await verifyAdminMfa({
          mfaToken,
          otpCode: mfaCode.trim(),
        });

        toast.success("Admin verification successful.");
        closeAuthModal();
        await navigate({ to: "/admin" });
        setPhone("");
        setPassword("");
        setMfaToken(null);
        setMfaMode(null);
        setMfaCode("");
        setMfaQrCodeDataUrl(null);
        setMfaManualEntryKey(null);
        return;
      }

      const result = await login({ phone, password });

      if (result.status === "mfa_required") {
        setMfaToken(result.mfaToken);
        setMfaMode(result.mfaMode);
        setMfaQrCodeDataUrl(result.qrCodeDataUrl ?? null);
        setMfaManualEntryKey(result.manualEntryKey ?? null);
        setErrorMessage("");
        toast.success(result.message);
        return;
      }

      const user = result.user;

      // Navigate based on user role
      if (user?.role === "ADMIN") {
        toast.success("Admin access granted. Welcome to the control center.");
        closeAuthModal();
        await navigate({ to: "/admin" });
      } else {
        toast.success("Signed in successfully.");
        closeAuthModal();
        await navigate({ to: "/user" });
      }

      setPhone("");
      setPassword("");
      setMfaToken(null);
      setMfaMode(null);
      setMfaCode("");
      setMfaQrCodeDataUrl(null);
      setMfaManualEntryKey(null);
    } catch (error: unknown) {
      const message = getLoginErrorMessage(error);
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleClose = () => {
    closeAuthModal();
    setPhone("");
    setPassword("");
    setMfaToken(null);
    setMfaMode(null);
    setMfaCode("");
    setMfaQrCodeDataUrl(null);
    setMfaManualEntryKey(null);
    setErrorMessage("");
  };

  if (authModal !== "login") return null;

  return (
    <>
      {/* Overlay - Full page coverage */}
      <div
        className="fixed top-0 left-0 right-0 bottom-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={handleClose}
        role="presentation"
        style={{
          position: "fixed",
          width: "100vw",
          height: "100vh",
          left: 0,
          top: 0,
          zIndex: 9999,
        }}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
        style={{ width: "100vw", height: "100vh", zIndex: 99999 }}
      >
        <div
          className="pointer-events-auto w-full max-w-md rounded-2xl border border-[#3d6ba3]/50 bg-gradient-to-br from-[#0d2137] via-[#1a3a6b] to-[#0d2137] p-8 shadow-2xl shadow-black/80 animate-in fade-in slide-in-from-bottom-4 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#f5c518] to-[#e6b800] shadow-lg shadow-[#f5c518]/40">
                <Lock size={20} className="text-[#0d2137]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Welcome back</h1>
                <p className="text-xs text-[#a8c4e0] mt-0.5">
                  Access your BetixPro account
                </p>
              </div>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Error Message */}
            {errorMessage && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/15 px-4 py-3 text-sm text-red-300 font-medium animate-in fade-in">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Phone field */}
            {!mfaToken && (
              <div className="space-y-2">
                <label
                  className="text-sm font-semibold text-white"
                  htmlFor="login-phone"
                >
                  Phone number
                </label>
                <div className="relative">
                  <Phone
                    size={16}
                    className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none"
                  />
                  <input
                    id="login-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="0712345678"
                    autoComplete="tel"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#3d6ba3]/40 bg-[#1a3a6b]/60 text-sm text-white placeholder-[#a8c4e0] outline-none transition-all duration-200 hover:border-[#3d6ba3]/60 focus:border-[#f5c518]/70 focus:bg-[#1a3a6b] focus:ring-2 focus:ring-[#f5c518]/30"
                    required
                  />
                </div>
                {!KENYAN_PHONE_REGEX.test(phone.trim()) && phone.length > 0 && (
                  <p className="text-xs text-amber-400 font-medium">
                    ✓ Enter a valid Kenyan phone number
                  </p>
                )}
              </div>
            )}

            {/* Password field */}
            {!mfaToken && (
              <div className="space-y-2">
                <label
                  className="text-sm font-semibold text-white"
                  htmlFor="login-password"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none"
                  />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="Your password"
                    autoComplete="current-password"
                    className="w-full pl-11 pr-11 py-3 rounded-xl border border-[#3d6ba3]/40 bg-[#1a3a6b]/60 text-sm text-white placeholder-[#a8c4e0] outline-none transition-all duration-200 hover:border-[#3d6ba3]/60 focus:border-[#f5c518]/70 focus:bg-[#1a3a6b] focus:ring-2 focus:ring-[#f5c518]/30"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {mfaToken && (
              <div className="space-y-2">
                <label
                  className="text-sm font-semibold text-white"
                  htmlFor="login-mfa-code"
                >
                  Microsoft Authenticator code
                </label>
                <input
                  id="login-mfa-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => {
                    setMfaCode(e.target.value.replace(/\D/g, ""));
                    if (errorMessage) setErrorMessage("");
                  }}
                  placeholder="6-digit code"
                  className="w-full px-4 py-3 rounded-xl border border-[#3d6ba3]/40 bg-[#1a3a6b]/60 text-sm text-white placeholder-[#a8c4e0] outline-none transition-all duration-200 hover:border-[#3d6ba3]/60 focus:border-[#f5c518]/70 focus:bg-[#1a3a6b] focus:ring-2 focus:ring-[#f5c518]/30"
                  required
                />
                <p className="text-xs text-[#a8c4e0]">
                  Enter the current 6-digit code from Microsoft Authenticator.
                </p>
              </div>
            )}

            {mfaToken && mfaMode === "totp_setup" && (
              <div className="space-y-3 rounded-xl border border-[#3d6ba3]/40 bg-[#1a3a6b]/35 p-4">
                <p className="text-xs text-[#a8c4e0]">
                  First-time setup: scan this QR in Microsoft Authenticator,
                  then enter the 6-digit code below.
                </p>
                {mfaQrCodeDataUrl && (
                  <img
                    src={mfaQrCodeDataUrl}
                    alt="Authenticator setup QR code"
                    className="h-40 w-40 rounded-lg border border-[#3d6ba3]/50 bg-white p-2"
                  />
                )}
                {mfaManualEntryKey && (
                  <p className="text-xs text-[#a8c4e0] break-all">
                    Manual key:{" "}
                    <span className="text-white">{mfaManualEntryKey}</span>
                  </p>
                )}
              </div>
            )}

            {/* Forgot Password Link */}
            {!mfaToken && (
              <div className="text-right pt-1">
                <button
                  type="button"
                  onClick={() => {
                    closeAuthModal();
                  }}
                  className="text-xs text-[#f5c518] hover:text-[#e6b800] transition-colors font-semibold hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                (!mfaToken && !formValid) ||
                (Boolean(mfaToken) && mfaCode.trim().length !== 6) ||
                isSubmitting
              }
              className="w-full py-3 mt-8 rounded-xl bg-gradient-to-r from-[#f5c518] to-[#e6b800] font-bold text-[#0d2137] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:shadow-[#f5c518]/50 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>{mfaToken ? "Verify admin login" : "Sign in"}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="border-t border-[#3d6ba3]/30 pt-5 mt-6 text-center">
            <p className="text-sm text-[#a8c4e0]">
              Don&apos;t have an account?{" "}
              <button
                onClick={() => openAuthModal("register")}
                className="font-semibold text-[#f5c518] hover:text-[#e6b800] transition-colors hover:underline"
              >
                Create one
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
