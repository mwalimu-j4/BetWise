import type { FormEvent } from "react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { api } from "@/api/axiosConfig";
import AuthCard from "@/components/auth/AuthCard";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_SUCCESS_MESSAGE =
  "If an account with that email exists, a reset link has been sent.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isValid = EMAIL_REGEX.test(email.trim());

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await api.post("/auth/forgot-password", {
        email: email.trim(),
      });
      setMessage(GENERIC_SUCCESS_MESSAGE);
    } catch {
      setMessage(GENERIC_SUCCESS_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Forgot password"
      subtitle="Enter your email and we will send a secure reset link."
      backTo="/"
      backLabel="Back to login"
      footer={
        <p className="text-center text-xs text-admin-text-muted">
          Return to{" "}
          <Link className="font-semibold text-admin-accent" to="/">
            login
          </Link>
        </p>
      }
    >
      <form className="mt-1 grid gap-2.5" onSubmit={handleSubmit}>
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
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-9 rounded-lg border border-admin-border bg-[var(--color-bg-elevated)] px-2.5 text-xs text-admin-text-primary outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={!isValid || loading}
          className="h-9 rounded-lg bg-admin-accent text-xs font-semibold text-[var(--color-text-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      {message ? (
        <p className="mt-2 text-xs text-emerald-400">{message}</p>
      ) : null}
    </AuthCard>
  );
}
