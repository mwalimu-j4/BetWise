import { useState, useMemo, useCallback, type FormEvent } from "react";
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
  const { login, authModal, closeAuthModal, openAuthModal } = useAuth();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
    if (!formValid) {
      setErrorMessage("Enter a valid Kenyan phone number and password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await login({
        phone,
        password,
      });

      toast.success("Signed in successfully.");
      closeAuthModal();
      setPhone("");
      setPassword("");
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
    setErrorMessage("");
  };

  if (authModal !== "login") return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={handleClose}
        role="presentation"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-md rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300"
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
                <p className="text-xs text-slate-400 mt-0.5">
                  Access your BetWise account
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
            <div className="space-y-2">
              <label
                className="text-sm font-semibold text-slate-300"
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
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-600/40 bg-slate-800/60 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 hover:border-slate-500/60 focus:border-[#f5c518]/70 focus:bg-slate-800 focus:ring-2 focus:ring-[#f5c518]/30"
                  required
                />
              </div>
              {!KENYAN_PHONE_REGEX.test(phone.trim()) && phone.length > 0 && (
                <p className="text-xs text-amber-400 font-medium">
                  ✓ Enter a valid Kenyan phone number
                </p>
              )}
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <label
                className="text-sm font-semibold text-slate-300"
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
                  className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-600/40 bg-slate-800/60 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 hover:border-slate-500/60 focus:border-[#f5c518]/70 focus:bg-slate-800 focus:ring-2 focus:ring-[#f5c518]/30"
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

            {/* Forgot Password Link */}
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!formValid || isSubmitting}
              className="w-full py-3 mt-8 rounded-xl bg-gradient-to-r from-[#f5c518] to-[#e6b800] font-bold text-[#0d2137] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:shadow-[#f5c518]/50 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="border-t border-slate-700/40 pt-5 mt-6 text-center">
            <p className="text-sm text-slate-400">
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
