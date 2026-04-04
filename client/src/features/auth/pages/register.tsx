import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import AuthCard from "@/components/auth/AuthCard";
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
        general: ["Unable to reach server. Check your internet or API server."],
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

  function clearFieldError(field: string) {
    setErrors((previous) => ({
      ...previous,
      [field]: undefined,
      general: undefined,
    }));
  }

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
    <AuthCard
      title="Create your account"
      subtitle="Create an account quickly."
      backTo="/login"
      backLabel="Back to login"
      footer={
        <p className="text-center text-xs text-admin-text-muted">
          Already have an account?{" "}
          <Link className="font-semibold text-admin-accent" to="/login">
            Login
          </Link>
        </p>
      }
    >
      <form className="grid gap-2.5" onSubmit={handleSubmit}>
        <div className="grid gap-1">
          <label
            className="text-xs font-medium text-admin-text-primary"
            htmlFor="email"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearFieldError("email");
            }}
            className="h-9 rounded-lg border border-admin-border bg-[var(--color-bg-elevated)] px-2.5 text-xs text-admin-text-primary outline-none"
            required
          />
          {!emailValid && email.length > 0 ? (
            <p className="text-xs text-amber-400">
              Enter a valid email format.
            </p>
          ) : null}
          {errors.email?.map((message) => (
            <p key={message} className="text-xs text-red-400">
              {message}
            </p>
          ))}
        </div>

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
              clearFieldError("phone");
            }}
            placeholder="07XXXXXXXX or 01XXXXXXXX or +2547XXXXXXXX"
            className="h-9 rounded-lg border border-admin-border bg-[var(--color-bg-elevated)] px-2.5 text-xs text-admin-text-primary outline-none"
            required
          />
          <p className="text-xs text-admin-text-muted">Kenyan format only.</p>
          {!phoneValid && phone.length > 0 ? (
            <p className="text-xs text-amber-400">
              Invalid Kenyan phone format.
            </p>
          ) : null}
          {errors.phone?.map((message) => (
            <p key={message} className="text-xs text-red-400">
              {message}
            </p>
          ))}
        </div>

        <div className="grid gap-1">
          <label
            className="text-xs font-medium text-admin-text-primary"
            htmlFor="password"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearFieldError("password");
            }}
            className="h-9 rounded-lg border border-admin-border bg-[var(--color-bg-elevated)] px-2.5 text-xs text-admin-text-primary outline-none"
            required
          />
          <PasswordStrengthIndicator password={password} />
          {errors.password?.map((message) => (
            <p key={message} className="text-xs text-red-400">
              {message}
            </p>
          ))}
        </div>

        <div className="grid gap-1">
          <label
            className="text-xs font-medium text-admin-text-primary"
            htmlFor="confirm-password"
          >
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              clearFieldError("confirmPassword");
            }}
            className="h-9 rounded-lg border border-admin-border bg-[var(--color-bg-elevated)] px-2.5 text-xs text-admin-text-primary outline-none"
            required
          />
          {!confirmValid && confirmPassword.length > 0 ? (
            <p className="text-xs text-amber-400">Passwords do not match.</p>
          ) : null}
          {errors.confirmPassword?.map((message) => (
            <p key={message} className="text-xs text-red-400">
              {message}
            </p>
          ))}
        </div>

        {errors.general?.map((message) => (
          <p
            key={message}
            className="rounded-md border border-red-400/30 bg-red-500/10 px-2 py-1.5 text-xs text-red-300"
          >
            {message}
          </p>
        ))}

        <button
          type="submit"
          disabled={!formValid || isSubmitting}
          className="h-9 rounded-lg bg-admin-accent text-xs font-semibold text-[var(--color-text-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}
