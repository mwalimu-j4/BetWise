import { useState, useMemo, useCallback, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { Eye, EyeOff, Loader2, Lock, Phone } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  return (
    <Dialog open={authModal === "login"} onOpenChange={handleClose}>
      <DialogContent className="border-0 bg-gradient-to-b from-[#0d2137] via-[#1a3a6b] to-[#0d2137] text-white shadow-2xl sm:max-w-md">
        <DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-start gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#f5c518] to-[#e6b800]">
                <Lock size={18} className="text-[#0d2137]" />
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                Welcome back
              </DialogTitle>
            </div>
            <p className="text-sm text-slate-400">
              Sign in to your BetWise account
            </p>
          </div>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Error Message */}
          {errorMessage && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          {/* Phone field */}
          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-slate-300"
              htmlFor="login-phone"
            >
              Phone number
            </label>
            <div className="relative">
              <Phone
                size={18}
                className="absolute left-3 top-3 text-slate-500"
              />
              <input
                id="login-phone"
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="0712345678 or +254712345678"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-500/30 bg-slate-950/40 text-sm text-white placeholder-slate-600 outline-none transition-all duration-200 hover:border-slate-400/50 focus:border-[#f5c518]/50 focus:bg-slate-950/60 focus:ring-2 focus:ring-[#f5c518]/25"
                required
              />
            </div>
            {!KENYAN_PHONE_REGEX.test(phone.trim()) && phone.length > 0 && (
              <p className="text-xs text-amber-400">
                Enter a valid Kenyan phone number
              </p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-slate-300"
              htmlFor="login-password"
            >
              Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-3 text-slate-500" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-500/30 bg-slate-950/40 text-sm text-white placeholder-slate-600 outline-none transition-all duration-200 hover:border-slate-400/50 focus:border-[#f5c518]/50 focus:bg-slate-950/60 focus:ring-2 focus:ring-[#f5c518]/25"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!formValid || isSubmitting}
            className="w-full py-2.5 mt-6 rounded-lg bg-gradient-to-r from-[#f5c518] to-[#e6b800] font-semibold text-[#0d2137] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-[#f5c518]/20 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </button>

          {/* Forgot Password Link */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                closeAuthModal();
                // TODO: Open forgot password modal/page
              }}
              className="text-xs text-[#f5c518] hover:text-[#e6b800] transition-colors font-medium"
            >
              Forgot password?
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-slate-700/50 pt-4 text-center">
          <p className="text-xs text-slate-400">
            Don&apos;t have an account?{" "}
            <button
              onClick={() => openAuthModal("register")}
              className="font-semibold text-[#f5c518] hover:text-[#e6b800] transition-colors"
            >
              Create one
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
