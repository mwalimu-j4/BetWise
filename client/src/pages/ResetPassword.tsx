import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { api } from "@/api/axiosConfig";
import AuthCard from "@/components/auth/AuthCard";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { token?: string };
  const token = typeof search.token === "string" ? search.token : "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const canSubmit = useMemo(() => {
    return (
      token.length > 0 && newPassword.length > 0 && confirmPassword.length > 0
    );
  }, [confirmPassword.length, newPassword.length, token.length]);

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
          confirmPassword,
        },
      );
      setSuccessMessage(data.message);
      setTimeout(() => {
        void navigate({ to: "/login" });
      }, 1200);
    } catch (error: unknown) {
      const apiMessage = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      setErrorMessage(apiMessage ?? "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Reset password"
      subtitle="Set your new password."
      backTo="/login"
      backLabel="Back to login"
      footer={
        <p className="text-center text-xs text-admin-text-muted">
          Back to{" "}
          <Link className="font-semibold text-admin-accent" to="/login">
            login
          </Link>
        </p>
      }
    >
      {!token ? (
        <p className="mt-2 rounded-lg border border-admin-border bg-[var(--color-bg-elevated)] p-2.5 text-xs text-admin-text-muted">
          Missing reset token. Open the reset link from your email.
        </p>
      ) : (
        <form className="mt-1 grid gap-2.5" onSubmit={handleSubmit}>
          <div className="grid gap-1">
            <label
              className="text-xs font-medium text-admin-text-primary"
              htmlFor="new-password"
            >
              New password
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
          </div>

          <div className="grid gap-1">
            <label
              className="text-xs font-medium text-admin-text-primary"
              htmlFor="confirm-password"
            >
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="h-9 rounded-lg border border-admin-border bg-[var(--color-bg-elevated)] px-2.5 text-xs text-admin-text-primary outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="h-9 rounded-lg bg-admin-accent text-xs font-semibold text-[var(--color-text-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Resetting..." : "Reset password"}
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
