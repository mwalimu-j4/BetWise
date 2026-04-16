import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/api/axiosConfig";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Loader2,
  Mail,
  ShieldAlert,
} from "lucide-react";

type FeedbackTone = "info" | "success" | "error";

type FeedbackState = {
  tone: FeedbackTone;
  message: string;
};

export default function ForgotPasswordModal() {
  const { authModal, closeAuthModal, openAuthModal } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>({
    tone: "info",
    message: "Enter your email.",
  });

  if (authModal !== "forgot-password") return null;

  const isValid = email.length > 4;

  function setBackToLogin() {
    closeAuthModal();
    openAuthModal("login");
  }

  function handleEmailChange(value: string) {
    const nextValue = value.trim();
    setEmail(nextValue);

    if (loading) return;

    if (!nextValue) {
      setFeedback({
        tone: "info",
        message: "Enter your email.",
      });
      return;
    }

    if (nextValue.length > 4) {
      setFeedback({
        tone: "success",
        message: "Email looks good.",
      });
      return;
    }

    setFeedback({
      tone: "error",
      message: "Enter a valid email address to continue.",
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setFeedback({
      tone: "info",
      message: "Checking email...",
    });
    try {
      const { data } = await api.post<{ message: string }>(
        "/auth/forgot-password",
        { email },
      );
      setFeedback({
        tone: "success",
        message: data.message,
      });
    } catch {
      setFeedback({
        tone: "error",
        message: "Try again.",
      });
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
              </div>
            </div>
          </div>

          {feedback ? (
            <div
              className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
                feedback.tone === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                  : feedback.tone === "error"
                    ? "border-red-500/30 bg-red-500/10 text-red-100"
                    : "border-[#3d6ba3]/35 bg-[#1a3a6b]/35 text-[#d7e5f7]"
              }`}
            >
              <div className="flex items-start gap-2">
                {feedback.tone === "success" ? (
                  <CheckCircle2
                    size={16}
                    className="mt-0.5 shrink-0 text-emerald-300"
                  />
                ) : feedback.tone === "error" ? (
                  <CircleAlert
                    size={16}
                    className="mt-0.5 shrink-0 text-red-300"
                  />
                ) : (
                  <ShieldAlert
                    size={16}
                    className="mt-0.5 shrink-0 text-sky-300"
                  />
                )}
                <p className="leading-5">{feedback.message}</p>
              </div>
            </div>
          ) : null}

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
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className="h-11 w-full rounded-xl border border-admin-border bg-(--color-bg-elevated) pl-11 pr-3 text-sm text-admin-text-primary outline-none"
                />
              </div>
              {!isValid && email.length > 0 ? (
                <p className="text-xs text-amber-400 font-medium">
                  Enter a valid email address.
                </p>
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
          <div className="border-t border-[#3d6ba3]/30 pt-5 mt-6 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
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
