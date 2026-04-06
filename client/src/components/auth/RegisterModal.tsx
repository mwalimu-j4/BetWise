import { useState, useMemo, useCallback, type FormEvent } from "react";
import { isAxiosError } from "axios";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  Check,
  X,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

type FormErrors = Partial<Record<string, string[]>>;

const KENYAN_PHONE_REGEX = /^(\+?254|0)(7|1)\d{8}$/;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function normalizePhoneInput(value: string) {
  return value.replace(/[\s-]/g, "");
}

function extractRegisterErrors(error: unknown) {
  if (
    isAxiosError<{ errors?: Record<string, string[]>; message?: string }>(error)
  ) {
    const fieldErrors = error.response?.data?.errors;
    if (fieldErrors && Object.keys(fieldErrors).length > 0) {
      return fieldErrors;
    }

    const message = error.response?.data?.message;
    if (message && message.trim().length > 0) {
      return { general: [message] };
    }

    if (!error.response) {
      return {
        general: ["Unable to reach server. Check your internet connection."],
      };
    }
  }

  return { general: ["Registration failed. Please try again."] };
}

function passwordChecks(password: string) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export default function RegisterModal() {
  const { register, authModal, closeAuthModal, openAuthModal } = useAuth();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const emailValid = isValidEmail(email);
  const phoneValid = KENYAN_PHONE_REGEX.test(phone.trim());
  const passwordRules = passwordChecks(password);
  const passwordValid = Object.values(passwordRules).every(Boolean);
  const confirmValid =
    confirmPassword.length > 0 && confirmPassword === password;

  const formValid = useMemo(
    () => emailValid && phoneValid && passwordValid && confirmValid,
    [confirmValid, emailValid, passwordValid, phoneValid],
  );

  const clearFieldError = useCallback((field: string) => {
    setErrors((previous) => ({
      ...previous,
      [field]: undefined,
      general: undefined,
    }));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formValid) {
      setErrors({
        general: ["Please complete all fields correctly before submitting."],
      });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await register({
        email,
        phone,
        password,
        confirmPassword,
      });

      toast.success("Account created successfully. Welcome to BetWise.");
      closeAuthModal();
      setEmail("");
      setPhone("");
      setPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      const parsedErrors = extractRegisterErrors(error);
      setErrors(parsedErrors);
      if (parsedErrors.general?.[0]) {
        toast.error(parsedErrors.general[0]);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleClose = () => {
    closeAuthModal();
    setEmail("");
    setPhone("");
    setPassword("");
    setConfirmPassword("");
    setErrors({});
  };

  return (
    <>
      {authModal === "register" && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 shadow-2xl shadow-slate-950 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#f5c518] to-[#e6b800]">
                    <Lock size={20} className="text-slate-900" />
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    Create account
                  </h2>
                </div>
                <p className="text-sm text-slate-400">
                  Join BetWise and start betting smart
                </p>
              </div>

              <form className="space-y-3" onSubmit={handleSubmit}>
                {/* Error Message */}
                {errors.general && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    {errors.general[0]}
                  </div>
                )}

                {/* Email field */}
                <div className="space-y-1.5">
                  <label
                    className="block text-xs font-medium text-slate-300"
                    htmlFor="register-email"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3 top-2.5 text-slate-500"
                    />
                    <input
                      id="register-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearFieldError("email");
                      }}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-600/40 bg-slate-800/50 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 hover:border-slate-500/60 focus:border-[#f5c518]/50 focus:ring-2 focus:ring-[#f5c518]/30"
                      required
                    />
                  </div>
                  {!emailValid && email.length > 0 && (
                    <p className="text-xs text-red-400">Valid email required</p>
                  )}
                </div>

                {/* Phone field */}
                <div className="space-y-1.5">
                  <label
                    className="block text-xs font-medium text-slate-300"
                    htmlFor="register-phone"
                  >
                    Phone (Kenyan)
                  </label>
                  <div className="relative">
                    <Phone
                      size={16}
                      className="absolute left-3 top-2.5 text-slate-500"
                    />
                    <input
                      id="register-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(normalizePhoneInput(e.target.value));
                        clearFieldError("phone");
                      }}
                      placeholder="0712345678"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-600/40 bg-slate-800/50 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 hover:border-slate-500/60 focus:border-[#f5c518]/50 focus:ring-2 focus:ring-[#f5c518]/30"
                      required
                    />
                  </div>
                  {!phoneValid && phone.length > 0 && (
                    <p className="text-xs text-red-400">Invalid phone number</p>
                  )}
                </div>

                {/* Password field */}
                <div className="space-y-1.5">
                  <label
                    className="block text-xs font-medium text-slate-300"
                    htmlFor="register-password"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3 top-2.5 text-slate-500"
                    />
                    <input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearFieldError("password");
                      }}
                      placeholder="Min. 8 characters"
                      className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-600/40 bg-slate-800/50 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 hover:border-slate-500/60 focus:border-[#f5c518]/50 focus:ring-2 focus:ring-[#f5c518]/30"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password field */}
                <div className="space-y-1.5">
                  <label
                    className="block text-xs font-medium text-slate-300"
                    htmlFor="register-confirm"
                  >
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3 top-2.5 text-slate-500"
                    />
                    <input
                      id="register-confirm"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        clearFieldError("confirmPassword");
                      }}
                      placeholder="Confirm your password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-600/40 bg-slate-800/50 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 hover:border-slate-500/60 focus:border-[#f5c518]/50 focus:ring-2 focus:ring-[#f5c518]/30"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      {confirmPassword === password ? (
                        <>
                          <Check size={12} className="text-emerald-400" />
                          <span className="text-emerald-400">
                            Passwords match
                          </span>
                        </>
                      ) : (
                        <>
                          <X size={12} className="text-red-400" />
                          <span className="text-red-400">
                            Passwords don't match
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!formValid || isSubmitting}
                  className="w-full py-3 mt-5 rounded-lg bg-gradient-to-r from-[#f5c518] to-[#e6b800] font-semibold text-slate-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:shadow-[#f5c518]/40 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="border-t border-slate-700/30 pt-4 mt-4 text-center">
                <p className="text-xs text-slate-400">
                  Have an account?{" "}
                  <button
                    onClick={() => openAuthModal("login")}
                    className="font-semibold text-[#f5c518] hover:text-[#e6b800] transition-colors"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
