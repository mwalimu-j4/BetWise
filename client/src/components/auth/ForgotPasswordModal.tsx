import { api } from "@/api/axiosConfig";
import { useAuth } from "@/context/AuthContext";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Loader2,
  Mail,
  ShieldAlert,
} from "lucide-react";
import { useState, type FormEvent } from "react";

type Step = "email" | "success" | "instructions";

type FeedbackTone = "info" | "success" | "error";

type FeedbackState = {
  tone: FeedbackTone;
  message: string;
};

export default function ForgotPasswordModal() {
  const { authModal, closeAuthModal, openAuthModal } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [step, setStep] = useState<Step>("email");
  const [sentEmail, setSentEmail] = useState("");

  if (authModal !== "forgot-password") return null;

  const isValid =
    email.length > 0 && email.includes("@") && email.includes(".");

  function setBackToLogin() {
    closeAuthModal();
    openAuthModal("login");
  }

  function handleReset() {
    setEmail("");
    setFeedback(null);
    setStep("email");
    setSentEmail("");
  }

  function handleEmailChange(value: string) {
    const nextValue = value.trim();
    setEmail(nextValue);

    if (loading) return;

    if (!nextValue) {
      setFeedback(null);
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
      message: "Enter a valid email address.",
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

      // Check if email was NOT found in database
      if (
        data.message.includes("No account found") ||
        data.message.toLowerCase().includes("not found")
      ) {
        setFeedback({
          tone: "error",
          message: "Email does not exist in our system.",
        });
        setLoading(false);
        return;
      }

      // Email EXISTS and reset link was sent successfully
      setSentEmail(email);
      setStep("success");
      setFeedback(null);
      setLoading(false);

      // Auto-transition to instructions after 2 seconds
      setTimeout(() => {
        setStep("instructions");
      }, 2000);
    } catch (error) {
      setFeedback({
        tone: "error",
        message: "An error occurred. Please try again.",
      });
      setLoading(false);
    }
  }

  // Step 1: Email & Phone Input
  const renderEmailStep = () => (
    <>
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
              <CircleAlert size={16} className="mt-0.5 shrink-0 text-red-300" />
            ) : (
              <ShieldAlert size={16} className="mt-0.5 shrink-0 text-sky-300" />
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
              disabled={loading}
              className="h-11 w-full rounded-xl border border-admin-border bg-(--color-bg-elevated) pl-11 pr-3 text-sm text-admin-text-primary outline-none disabled:opacity-60"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!isValid || loading}
          className="h-10 rounded-lg bg-admin-accent text-sm font-semibold text-(--color-text-dark) disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Validating...
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
    </>
  );

  // Step 2: Success Confirmation
  const renderSuccessStep = () => (
    <div className="space-y-6">
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
          <CheckCircle2 size={24} className="text-emerald-300" />
        </div>
        <p className="text-sm font-medium text-emerald-100">✓ Email Verified</p>
        <p className="mt-2 text-xs text-emerald-200/80">
          Reset link sent to <strong>{sentEmail}</strong>
        </p>
      </div>

      <p className="text-center text-xs text-[#a8c4e0]">
        Redirecting to instructions...
      </p>
    </div>
  );

  // Step 3: Instructions Modal
  const renderInstructionsStep = () => (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#3d6ba3]/20 bg-[#1a3a6b]/40 p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">
          What to do next:
        </h3>
        <ol className="space-y-3 text-xs text-[#a8c4e0]">
          <li className="flex gap-3 items-start">
            <span className="font-semibold text-[#f5c518] mt-0.5">1.</span>
            <span>
              Check your inbox at{" "}
              <strong className="text-white">{sentEmail}</strong>
            </span>
          </li>
          <li className="flex gap-3 items-start">
            <span className="font-semibold text-[#f5c518] mt-0.5">2.</span>
            <span>
              Click the reset link in the email (valid for 15 minutes)
            </span>
          </li>
          <li className="flex gap-3 items-start">
            <span className="font-semibold text-[#f5c518] mt-0.5">3.</span>
            <span>Create a new password</span>
          </li>
          <li className="flex gap-3 items-start">
            <span className="font-semibold text-[#f5c518] mt-0.5">4.</span>
            <span>Log in with your new password</span>
          </li>
        </ol>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3">
        <AlertCircle size={16} className="text-amber-300 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-100">
          <strong>Link expires in 15 minutes.</strong> Check spam folder or
          request a new link if needed.
        </p>
      </div>

      <button
        onClick={handleReset}
        className="h-10 w-full rounded-lg border border-[#3d6ba3]/40 bg-[var(--color-bg-elevated)] text-sm font-semibold text-[#a8c4e0] hover:border-[#f5c518]/50 hover:text-white transition-colors"
      >
        Request another link
      </button>

      <div className="border-t border-[#3d6ba3]/30 pt-5 text-center">
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
  );

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
                  {step === "email"
                    ? "Forgot password"
                    : step === "success"
                      ? "Success!"
                      : "Check your email"}
                </h1>
                {step !== "email" && (
                  <p className="text-xs text-[#a8c4e0] mt-1">
                    {step === "success"
                      ? "Reset link sent"
                      : "Password reset instructions"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Content based on step */}
          {step === "email" && renderEmailStep()}
          {step === "success" && renderSuccessStep()}
          {step === "instructions" && renderInstructionsStep()}
        </div>
      </div>
    </>
  );
}
