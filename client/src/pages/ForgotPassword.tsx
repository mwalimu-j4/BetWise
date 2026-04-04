import type { FormEvent } from "react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { api } from "@/api/axiosConfig";
import AuthCard from "@/components/auth/AuthCard";

const KENYAN_PHONE_REGEX = /^(\+?254|0)(7|1)\d{8}$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isValid = email.length > 4 && KENYAN_PHONE_REGEX.test(phone.trim());

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setMessage("");

    try {
      const { data } = await api.post<{ message: string }>(
        "/auth/forgot-password",
        {
          email,
          phone,
        },
      );
      setMessage(data.message);
    } catch {
      setMessage(
        "If those details match our records, a reset link has been sent",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Forgot password"
      subtitle="We'll send a secure reset link if your details match."
      backTo="/login"
      backLabel="Back to login"
      footer={
        <p className="text-center text-sm text-admin-text-muted">
          Remembered your password?{" "}
          <Link className="font-semibold text-admin-accent" to="/login">
            Go to login
          </Link>
        </p>
      }
    >
      <form className="grid gap-3.5" onSubmit={handleSubmit}>
        <div className="grid gap-1.5">
          <label
            className="text-sm font-medium text-admin-text-primary"
            htmlFor="forgot-email"
          >
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value.trim())}
            className="h-11 rounded-xl border border-admin-border bg-[var(--color-bg-elevated)] px-3 text-sm text-admin-text-primary outline-none"
          />
        </div>

        <div className="grid gap-1.5">
          <label
            className="text-sm font-medium text-admin-text-primary"
            htmlFor="forgot-phone"
          >
            Phone
          </label>
          <input
            id="forgot-phone"
            type="tel"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="07XXXXXXXX or +2547XXXXXXXX"
            className="h-11 rounded-xl border border-admin-border bg-[var(--color-bg-elevated)] px-3 text-sm text-admin-text-primary outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={!isValid || loading}
          className="h-10 rounded-lg bg-admin-accent text-sm font-semibold text-[var(--color-text-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      {message ? (
        <p className="mt-3 text-sm text-admin-text-muted">{message}</p>
      ) : null}
    </AuthCard>
  );
}
