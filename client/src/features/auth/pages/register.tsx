import type { FormEvent } from "react";
import { useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import AuthModal from "@/components/auth/AuthModal";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
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

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

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
      void navigate({ to: "/user" });
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
    <AuthLayout>
      <AuthModal
        title="Create your account"
        subtitle="Join BetWise and start betting smart"
        backTo="/login"
        backLabel="Back to login"
        footer={
          <div className="text-center">
            <p className="text-xs text-slate-400">
              Already have an account?{" "}
              <Link
                className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                to="/login"
              >
                Sign in
              </Link>
            </p>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Email field */}
          <div className="space-y-2">
            <label
              className="block text-xs font-medium text-slate-300"
              htmlFor="email"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError("email");
              }}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 hover:border-white/20 focus:border-cyan-500/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-500/20 backdrop-blur-sm"
              required
            />
            {!emailValid && email.length > 0 && (
              <p className="text-xs text-amber-400 flex items-center gap-1">
                <XCircle size={13} />
                Enter a valid email
              </p>
            )}
            {errors.email?.map((message) => (
              <p key={message} className="text-xs text-red-400">
                {message}
              </p>
            ))}
          </div>

          {/* Phone field */}
          <div className="space-y-2">
            <label
              className="block text-xs font-medium text-slate-300"
              htmlFor="phone"
            >
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(normalizePhoneInput(e.target.value));
                clearFieldError("phone");
              }}
              placeholder="07xxxxxxxx"
              className="w-full px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 hover:border-white/20 focus:border-cyan-500/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-500/20 backdrop-blur-sm"
              required
            />
            <p className="text-xs text-slate-400">Kenyan format only</p>
            {!phoneValid && phone.length > 0 && (
              <p className="text-xs text-amber-400 flex items-center gap-1">
                <XCircle size={13} />
                Invalid Kenyan phone format
              </p>
            )}
            {errors.phone?.map((message) => (
              <p key={message} className="text-xs text-red-400">
                {message}
              </p>
            ))}
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <label
              className="block text-xs font-medium text-slate-300"
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError("password");
                }}
                placeholder="Create a strong password"
                className="w-full px-4 py-2.5 pr-10 rounded-lg border border-white/10 bg-white/5 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 hover:border-white/20 focus:border-cyan-500/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-500/20 backdrop-blur-sm"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordStrengthIndicator password={password} />
            {errors.password?.map((message) => (
              <p key={message} className="text-xs text-red-400">
                {message}
              </p>
            ))}
          </div>

          {/* Confirm password field */}
          <div className="space-y-2">
            <label
              className="block text-xs font-medium text-slate-300"
              htmlFor="confirm-password"
            >
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearFieldError("confirmPassword");
                }}
                placeholder="Confirm your password"
                className="w-full px-4 py-2.5 pr-10 rounded-lg border border-white/10 bg-white/5 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 hover:border-white/20 focus:border-cyan-500/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-500/20 backdrop-blur-sm"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {!confirmValid && confirmPassword.length > 0 && (
              <p className="text-xs text-amber-400 flex items-center gap-1">
                <XCircle size={13} />
                Passwords do not match
              </p>
            )}
            {errors.confirmPassword?.map((message) => (
              <p key={message} className="text-xs text-red-400">
                {message}
              </p>
            ))}
          </div>

          {/* General error */}
          {errors.general?.map((message) => (
            <div
              key={message}
              className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300 backdrop-blur-sm"
            >
              {message}
            </div>
          ))}

          {/* Submit button */}
          <button
            type="submit"
            disabled={!formValid || isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-sm font-semibold text-white transition-all duration-200 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-cyan-500 disabled:hover:to-blue-500 shadow-lg hover:shadow-xl"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                Create account
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </AuthModal>
    </AuthLayout>
  );
}
