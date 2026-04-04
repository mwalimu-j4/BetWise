import type { FormEvent } from "react";
import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { isAxiosError } from "axios";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AuthCard from "@/components/auth/AuthCard";
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
      return "Unable to reach server. Check your internet or API server.";
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
      // The useEffect above will handle the redirect
    } catch (error: unknown) {
      const message = getLoginErrorMessage(error);
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in and continue."
      backTo="/user"
      backLabel="Back home"
      footer={
        <p className="text-center text-xs text-admin-text-muted">
          Don&apos;t have an account?{" "}
          <Link className="font-semibold text-admin-accent" to="/register">
            Register
          </Link>
        </p>
      }
    >
      <form className="grid gap-2.5" onSubmit={handleSubmit}>
        <div className="grid gap-1">
          <label
            className="text-xs font-medium text-admin-text-primary"
            htmlFor="phone"
          >
            Phone number
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(event) => {
              setPhone(normalizePhoneInput(event.target.value));
              if (errorMessage) {
                setErrorMessage("");
              }
            }}
            placeholder="0712345678"
            className="h-9 rounded-lg border border-admin-border bg-[var(--color-bg-elevated)] px-2.5 text-xs text-admin-text-primary outline-none"
            // autoComplete="tel"
            required
          />
          {!KENYAN_PHONE_REGEX.test(phone.trim()) && phone.length > 0 ? (
            <p className="text-xs text-red-400">
              Enter a valid kenyan phone number
            </p>
          ) : null}
        </div>

        <div className="grid gap-1">
          <label
            className="text-xs font-medium text-admin-text-primary"
            htmlFor="password"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (errorMessage) {
                  setErrorMessage("");
                }
              }}
              className="h-9 w-full rounded-lg border border-admin-border bg-[var(--color-bg-elevated)] px-2.5 pr-10 text-xs text-admin-text-primary outline-none"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-admin-text-muted"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-admin-text-muted">Secure sign-in</span>
          <Link
            className="font-semibold text-admin-accent"
            to="/forgot-password"
          >
            Forgot password?
          </Link>
        </div>

        {errorMessage ? (
          <p className="rounded-md border border-red-400/30 bg-red-500/10 px-2 py-1.5 text-xs text-red-300">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!formValid || isSubmitting}
          className="flex items-center justify-center gap-2 h-9 rounded-lg bg-admin-accent text-xs font-semibold text-[var(--color-text-dark)] disabled:cursor-not-allowed disabled:opacity-60 transition-all"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {isSubmitting ? "Signing in..." : "Login"}
        </button>
      </form>
    </AuthCard>
  );
}
