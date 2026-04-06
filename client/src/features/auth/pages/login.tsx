import type { FormEvent } from "react";
import { useMemo, useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { isAxiosError } from "axios";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import AuthLayout from "@/components/auth/AuthLayout";
import AuthModal from "@/components/auth/AuthModal";
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

export default function Login() {
  const { login, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { redirect?: string };

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const formValid = useMemo(() => {
    return KENYAN_PHONE_REGEX.test(phone.trim()) && password.length > 0;
  }, [password.length, phone]);

  // Handle redirect when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      let redirectTo = "/user";
      if (user.role === "ADMIN") {
        redirectTo = "/admin";
      } else if (search.redirect && search.redirect.startsWith("/")) {
        redirectTo = search.redirect;
      }
      void navigate({ to: redirectTo as never });
    }
  }, [isAuthenticated, user, navigate, search.redirect]);

  const handlePhoneChange = useCallback((value: string) => {
    setPhone(normalizePhoneInput(value));
    if (errorMessage) setErrorMessage("");
  }, [errorMessage]);

  const handlePasswordChange = useCallback((value: string) => {
    setPassword(value);
    if (errorMessage) setErrorMessage("");
  }, [errorMessage]);

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
    } catch (error: unknown) {
      const message = getLoginErrorMessage(error);
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <AuthModal
        title="Welcome back"
        subtitle="Sign in to your BetWise account"
        backTo="/"
        backLabel="Home"
        footer={
          <div className="text-center">
            <p className="text-xs text-slate-400">
              Don&apos;t have an account?{" "}
              <Link className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors" to="/register">
                Create one
              </Link>
            </p>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
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
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="07xxxxxxxx"
              className="w-full px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 hover:border-white/20 focus:border-cyan-500/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-500/20 backdrop-blur-sm"
              required
            />
            {!KENYAN_PHONE_REGEX.test(phone.trim()) && phone.length > 0 && (
              <p className="text-xs text-amber-400">
                Enter a valid Kenyan phone number
              </p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                className="block text-xs font-medium text-slate-300"
                htmlFor="password"
              >
                Password
              </label>
              <Link
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                to="/forgot-password"
              >
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className="w-full px-4 py-2.5 pr-10 rounded-lg border border-white/10 bg-white/5 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 hover:border-white/20 focus:border-cyan-500/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-500/20 backdrop-blur-sm"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300 backdrop-blur-sm">
              {errorMessage}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={!formValid || isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-sm font-semibold text-white transition-all duration-200 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-cyan-500 disabled:hover:to-blue-500 shadow-lg hover:shadow-xl"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </AuthModal>
    </AuthLayout>
  );
}
