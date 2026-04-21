import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { api } from "@/api/axiosConfig";
import AuthCard from "@/components/auth/AuthCard";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";

const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,128}$/;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!token) {
      void navigate({ to: "/forgot-password" });
    }
  }, [navigate, token]);

  const passwordValidationError = useMemo(() => {
    if (!newPassword) {
      return "";
    }

    if (!STRONG_PASSWORD_REGEX.test(newPassword)) {
      return "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.";
    }

    return "";
  }, [newPassword]);

  const confirmValidationError = useMemo(() => {
    if (!confirmPassword) {
      return "";
    }

    if (newPassword !== confirmPassword) {
      return "Passwords do not match.";
    }

    return "";
  }, [confirmPassword, newPassword]);

  const canSubmit = useMemo(() => {
    return (
      token.length > 0 &&
      newPassword.length > 0 &&
      confirmPassword.length > 0 &&
      !passwordValidationError &&
      !confirmValidationError
    );
  }, [
    confirmPassword.length,
    confirmValidationError,
    newPassword.length,
    passwordValidationError,
    token.length,
  ]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data } = await api.post<{ message: string }>(
        "/auth/reset-password",
        {
          token,
          newPassword,
        },
      );
      setSuccessMessage(data.message);
      setTimeout(() => {
        void navigate({ to: "/" });
      }, 2000);
    } catch (error: unknown) {
      const apiMessage = (
        error as { response?: { data?: { error?: string; message?: string } } }
      )?.response?.data?.error;
      const fallbackMessage = (
        error as { response?: { data?: { error?: string; message?: string } } }
      )?.response?.data?.message;
      setErrorMessage(apiMessage ?? "Unable to reset password.");
      if (!apiMessage && fallbackMessage) {
        setErrorMessage(fallbackMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Reset password"
      subtitle="Set your new password securely."
      backTo="/forgot-password"
      backLabel="Back"
      footer={
        <p className="text-center text-xs text-admin-text-muted">
          Back to{" "}
          <Link className="font-semibold text-admin-accent" to="/">
            login
          </Link>
        </p>
      }
    >
      {!token ? null : (
        <form className="mt-1 grid gap-2.5" onSubmit={handleSubmit}>
          <div className="grid gap-1">
            <label
              className="text-xs font-medium text-admin-text-primary"
              htmlFor="new-password"
            >
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="h-9 rounded-lg border border-admin-border bg-[var(--color-bg-elevated)] px-2.5 text-xs text-admin-text-primary outline-none"
            />
            <PasswordStrengthIndicator password={newPassword} />
            {passwordValidationError ? (
              <p className="text-xs text-red-400">{passwordValidationError}</p>
            ) : null}
          </div>

          <div className="grid gap-1">
            <label
              className="text-xs font-medium text-admin-text-primary"
              htmlFor="confirm-password"
            >
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="h-9 rounded-lg border border-admin-border bg-[var(--color-bg-elevated)] px-2.5 text-xs text-admin-text-primary outline-none"
            />
            {confirmValidationError ? (
              <p className="text-xs text-red-400">{confirmValidationError}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="h-9 rounded-lg bg-admin-accent text-xs font-semibold text-[var(--color-text-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      )}

      {errorMessage ? (
        <p className="mt-2 text-xs text-red-400">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="mt-2 text-xs text-emerald-400">{successMessage}</p>
      ) : null}
    </AuthCard>
  );
}
