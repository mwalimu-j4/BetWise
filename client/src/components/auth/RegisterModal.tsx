import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "@tanstack/react-router";
import { isAxiosError } from "axios";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  UserPlus,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

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

export default function RegisterModal() {
  const { register, authModal, closeAuthModal, openAuthModal } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation Logic
  const passwordValid = password.length >= 6;
  const emailValid = email.length > 0 && isValidEmail(email);
  const phoneValid = phone.length > 0 && KENYAN_PHONE_REGEX.test(phone);
  const passwordsMatch = password === confirmPassword && password.length >= 6;

  // Require all fields to be filled and valid
  const canSubmit = useMemo(
    () =>
      emailValid &&
      phoneValid &&
      passwordValid &&
      confirmPassword.length > 0 &&
      passwordsMatch,
    [emailValid, phoneValid, passwordValid, confirmPassword, passwordsMatch],
  );

  const clearFieldError = useCallback((field: string) => {
    setErrors((previous) => ({
      ...previous,
      [field]: undefined,
      general: undefined,
    }));
  }, []);

  const resetAuthState = useCallback(() => {
    setEmail("");
    setPhone("");
    setPassword("");
    setConfirmPassword("");
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, []);

  const handleClose = useCallback(() => {
    closeAuthModal();
    resetAuthState();
  }, [closeAuthModal, resetAuthState]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      setErrors({
        general: ["Please fill in all fields before submitting."],
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

      toast.success("Account created successfully. Welcome to BetixPro.");
      handleClose();

      // Navigate to user dashboard after successful registration
      await navigate({ to: "/user" });
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

  return (
    <>
      {authModal === "register" && (
        <>
          {/* Overlay - Full page coverage */}
          <div
            onClick={handleClose}
            className="fixed top-0 left-0 right-0 bottom-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 animate-in fade-in cursor-pointer"
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
              className="pointer-events-auto w-full max-w-md rounded-2xl border border-[#3d6ba3]/50 bg-linear-to-br from-[#0d2137] via-[#1a3a6b] to-[#0d2137] p-8 shadow-2xl shadow-black/80 animate-in fade-in slide-in-from-bottom-4 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="mb-6 flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-[#f5c518] to-[#e6b800] shrink-0">
                    <Lock size={20} className="text-slate-900" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Create account
                    </h2>
                    <p className="text-sm text-[#a8c4e0]">
                      Join BetixPro and start betting smart
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-slate-400 hover:text-white transition-colors shrink-0 ml-2"
                  aria-label="Close modal"
                >
                  <X size={24} />
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* Error Message */}
                {errors.general && (
                  <div className="rounded-lg border border-red-500/50 bg-red-500/20 px-4 py-3 text-sm text-red-100">
                    <p className="font-semibold">{errors.general[0]}</p>
                  </div>
                )}

                {/* Email field */}
                <div className="space-y-1.5">
                  <label
                    className="block text-xs font-medium text-white"
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
                      autoComplete="email"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${
                        email && !isValidEmail(email)
                          ? "border-red-500/50 bg-red-500/10"
                          : "border-[#3d6ba3]/40 bg-[#1a3a6b]/50"
                      } text-sm text-white placeholder-[#a8c4e0] outline-none transition-all duration-200 hover:border-[#3d6ba3]/60 focus:border-[#f5c518]/50 focus:ring-2 focus:ring-[#f5c518]/30`}
                      required
                    />
                  </div>
                  {email && !isValidEmail(email) && (
                    <p className="text-xs text-red-400">
                      Please enter a valid email address
                    </p>
                  )}
                  {errors.email && (
                    <div className="space-y-1">
                      {errors.email.map((error, idx) => (
                        <p key={idx} className="text-xs text-red-400">
                          {error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Phone field */}
                <div className="space-y-1.5">
                  <label
                    className="block text-xs font-medium text-white"
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
                      autoComplete="tel"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${
                        phone && !KENYAN_PHONE_REGEX.test(phone)
                          ? "border-red-500/50 bg-red-500/10"
                          : "border-[#3d6ba3]/40 bg-[#1a3a6b]/50"
                      } text-sm text-white placeholder-[#a8c4e0] outline-none transition-all duration-200 hover:border-[#3d6ba3]/60 focus:border-[#f5c518]/50 focus:ring-2 focus:ring-[#f5c518]/30`}
                      required
                    />
                  </div>
                  {phone && !KENYAN_PHONE_REGEX.test(phone) && (
                    <p className="text-xs text-red-400">
                      Please enter a valid Kenyan phone number (e.g., 0712345678
                      or +254712345678)
                    </p>
                  )}
                  {errors.phone && (
                    <div className="space-y-1">
                      {errors.phone.map((error, idx) => (
                        <p key={idx} className="text-xs text-red-400">
                          {error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Password field */}
                <div className="space-y-1.5">
                  <label
                    className="block text-xs font-medium text-white"
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
                      placeholder="Enter your password"
                      autoComplete="new-password"
                      className={`w-full pl-10 pr-10 py-2.5 rounded-lg border ${
                        password && !passwordValid
                          ? "border-red-500/50 bg-red-500/10"
                          : "border-[#3d6ba3]/40 bg-[#1a3a6b]/50"
                      } text-sm text-white placeholder-[#a8c4e0] outline-none transition-all duration-200 hover:border-[#3d6ba3]/60 focus:border-[#f5c518]/50 focus:ring-2 focus:ring-[#f5c518]/30`}
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
                  {password && !passwordValid && (
                    <p className="text-xs text-red-400">
                      Password must be at least 6 characters
                    </p>
                  )}
                  {password && passwordValid && (
                    <p className="text-xs text-green-400">Password is valid</p>
                  )}
                  {errors.password && (
                    <div className="space-y-1">
                      {errors.password.map((error, idx) => (
                        <p key={idx} className="text-xs text-red-400">
                          {error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm Password field */}
                <div className="space-y-1.5">
                  <label
                    className="block text-xs font-medium text-white"
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
                      autoComplete="new-password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-[#3d6ba3]/40 bg-[#1a3a6b]/50 text-sm text-white placeholder-[#a8c4e0] outline-none transition-all duration-200 hover:border-[#3d6ba3]/60 focus:border-[#f5c518]/50 focus:ring-2 focus:ring-[#f5c518]/30"
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
                  {errors.confirmPassword && (
                    <div className="space-y-1">
                      {errors.confirmPassword.map((error, idx) => (
                        <p key={idx} className="text-xs text-red-400">
                          {error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  className="w-full py-3 mt-5 rounded-lg bg-[#f5c518] hover:bg-[#e6b800] font-semibold text-slate-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:shadow-[#f5c518]/40 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      Create account
                    </>
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="border-t border-[#3d6ba3]/30 pt-4 mt-4 text-center">
                <p className="text-xs text-[#a8c4e0]">
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
