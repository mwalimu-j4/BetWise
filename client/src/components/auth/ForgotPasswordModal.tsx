import { api } from "@/api/axiosConfig";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft,
  Loader2,
  Mail,
} from "lucide-react";
import { useState, type FormEvent } from "react";

const GENERIC_SUCCESS_MESSAGE =
  "If an account with that email exists, a reset link has been sent.";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordModal() {
  const { authModal, closeAuthModal, openAuthModal } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  if (authModal !== "forgot-password") return null;

  const isValid = EMAIL_REGEX.test(email.trim());

  function setBackToLogin() {
    closeAuthModal();
    openAuthModal("login");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setSuccessMessage(GENERIC_SUCCESS_MESSAGE);
    } catch {
      setSuccessMessage(GENERIC_SUCCESS_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={setBackToLogin}
        className="fixed top-0 left-0 right-0 bottom-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in cursor-pointer"
        role="presentation"
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
          <div className="mb-8 flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-[#f5c518] to-[#e6b800] shadow-lg shadow-[#f5c518]/40 shrink-0">
                <Mail size={20} className="text-[#0d2137]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Forgot password
                </h1>
                <p className="text-xs text-[#a8c4e0] mt-1">
                  Request a secure password reset link
                </p>
              </div>
            </div>
          </div>

          <form className="grid gap-3.5" onSubmit={handleSubmit}>
            <div className="grid gap-1.5">
              <label
                className="text-sm font-medium text-admin-text-primary"
                htmlFor="forgot-email"
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none"
                />
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                  disabled={loading}
                  className="h-11 w-full rounded-xl border border-admin-border bg-(--color-bg-elevated) pl-11 pr-3 text-sm text-admin-text-primary outline-none disabled:opacity-60"
                />
              </div>
              {error ? <p className="text-xs text-red-300">{error}</p> : null}
              {successMessage ? (
                <p className="text-xs text-emerald-200">{successMessage}</p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={!isValid || loading}
              className="h-10 rounded-lg bg-admin-accent text-sm font-semibold text-(--color-text-dark) disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Sending...
                </span>
              ) : (
                "Send reset link"
              )}
            </button>
          </form>

          <div className="border-t border-[#3d6ba3]/30 pt-5 mt-6 text-center">
            <button
              type="button"
              onClick={setBackToLogin}
              className="inline-flex items-center gap-2 rounded-lg border border-[#3d6ba3]/40 px-4 py-2 text-sm font-semibold text-[#a8c4e0] transition-colors hover:border-[#f5c518]/50 hover:text-white"
            >
              <ArrowLeft size={15} />
              Back to login
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
