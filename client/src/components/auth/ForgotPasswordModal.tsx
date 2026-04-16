import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/api/axiosConfig";
import { X, Mail, Phone } from "lucide-react";

const KENYAN_PHONE_REGEX = /^(\+?254|0)(7|1)\d{8}$/;

export default function ForgotPasswordModal() {
  const { authModal, closeAuthModal, openAuthModal } = useAuth();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (authModal !== "forgot-password") return null;

  const isValid = email.length > 4 && KENYAN_PHONE_REGEX.test(phone.trim());

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setMessage("");
    try {
      const { data } = await api.post<{ message: string }>(
        "/auth/forgot-password",
        { email, phone },
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
    <>
      {/* Overlay */}
      <div
        onClick={closeAuthModal}
        className="fixed top-0 left-0 right-0 bottom-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in cursor-pointer"
        role="presentation"
        style={{ position: "fixed", width: "100vw", height: "100vh", left: 0, top: 0, zIndex: 9999 }}
      />
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none" style={{ width: "100vw", height: "100vh", zIndex: 99999 }}>
        <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-[#3d6ba3]/50 bg-linear-to-br from-[#0d2137] via-[#1a3a6b] to-[#0d2137] p-8 shadow-2xl shadow-black/80 animate-in fade-in slide-in-from-bottom-4 duration-300" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="mb-8 flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-[#f5c518] to-[#e6b800] shadow-lg shadow-[#f5c518]/40 shrink-0">
                <Mail size={20} className="text-[#0d2137]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Forgot password</h1>
                <p className="text-xs text-[#a8c4e0] mt-0.5">We'll send a secure reset link if your details match.</p>
              </div>
            </div>
            <button type="button" onClick={closeAuthModal} className="text-slate-400 hover:text-white transition-colors shrink-0 ml-2" aria-label="Close modal">
              <X size={24} />
            </button>
          </div>
          <form className="grid gap-3.5" onSubmit={handleSubmit}>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-admin-text-primary" htmlFor="forgot-email">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                <input id="forgot-email" type="email" required value={email} onChange={e => setEmail(e.target.value.trim())} className="h-11 w-full rounded-xl border border-admin-border bg-[var(--color-bg-elevated)] pl-11 pr-3 text-sm text-admin-text-primary outline-none" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-admin-text-primary" htmlFor="forgot-phone">Phone</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                <input id="forgot-phone" type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XXXXXXXX or +2547XXXXXXXX" className="h-11 w-full rounded-xl border border-admin-border bg-[var(--color-bg-elevated)] pl-11 pr-3 text-sm text-admin-text-primary outline-none" />
              </div>
              {!KENYAN_PHONE_REGEX.test(phone.trim()) && phone.length > 0 && (
                <p className="text-xs text-amber-400 font-medium">✓ Enter a valid Kenyan phone number</p>
              )}
            </div>
            <button type="submit" disabled={!isValid || loading} className="h-10 rounded-lg bg-admin-accent text-sm font-semibold text-[var(--color-text-dark)] disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
          {message ? <p className="mt-3 text-sm text-admin-text-muted">{message}</p> : null}
          <div className="border-t border-[#3d6ba3]/30 pt-5 mt-6 text-center">
            <p className="text-sm text-[#a8c4e0]">
              Remembered your password?{' '}
              <button onClick={() => { closeAuthModal(); openAuthModal("login"); }} className="font-semibold text-[#f5c518] hover:text-[#e6b800] transition-colors hover:underline">Sign in</button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
