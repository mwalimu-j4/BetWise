import { useState, type FormEvent } from "react";
import { api } from "@/api/axiosConfig";
import { X, Phone } from "lucide-react";
import { toast } from "sonner";

type EditPhoneModalProps = {
  isOpen: boolean;
  currentPhone: string;
  onClose: () => void;
  onSuccess: () => void;
};

const KENYAN_PHONE_REGEX = /^(\+?254|0)(7|1)\d{8}$/;

function normalizePhoneInput(value: string) {
  return value.replace(/[\s-]/g, "");
}

function formatToE164(phone: string) {
  let cleaned = phone.replace(/\D/g, ""); // Remove all non-digits
  
  // Handle 07... or 01...
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "254" + cleaned.substring(1);
  } 
  // Handle 7... or 1... (9 digits)
  else if (cleaned.length === 9 && (cleaned.startsWith("7") || cleaned.startsWith("1"))) {
    cleaned = "254" + cleaned;
  }
  
  // Ensure it starts with +254
  if (!cleaned.startsWith("254")) {
    // If it doesn't start with 254 and it's not a standard Kenyan format, 
    // we just return as is with + (fallback)
    return phone.startsWith("+") ? phone : "+" + cleaned;
  }

  return "+" + cleaned;
}

export default function EditPhoneModal({
  isOpen,
  currentPhone,
  onClose,
  onSuccess,
}: EditPhoneModalProps) {
  const [newPhone, setNewPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isValid =
    newPhone.length > 0 &&
    KENYAN_PHONE_REGEX.test(newPhone.trim()) &&
    password.length > 0;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isValid) return;

    setIsLoading(true);
    setError("");

    try {
      const formattedPhone = formatToE164(newPhone.trim());
      
      await api.patch("/profile/phone", {
        newPhone: formattedPhone,
        password: password.trim(),
      });

      toast.success("Phone number updated successfully!");
      onSuccess();
      setNewPhone("");
      setPassword("");
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to update phone number";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-[#31455f] bg-[#0f172a] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#31455f] px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Update Phone</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#90a2bb] hover:text-white transition-colors"
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Current Phone
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-[#31455f] bg-[#1a2332] px-3 py-2.5 text-[#90a2bb]">
              <Phone size={16} />
              <span className="text-sm">{currentPhone}</span>
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-semibold text-white mb-2"
              htmlFor="new-phone"
            >
              New Phone Number
            </label>
            <div className="relative">
              <Phone
                size={16}
                className="absolute left-3 top-3 text-[#90a2bb]"
              />
              <input
                id="new-phone"
                type="tel"
                value={newPhone}
                onChange={(e) => {
                  setNewPhone(normalizePhoneInput(e.target.value));
                  setError("");
                }}
                placeholder="0712345678 or +254712345678"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#31455f] bg-[#1a2332] text-white placeholder-[#7f93ae] outline-none transition focus:border-[#f5c518] focus:ring-2 focus:ring-[#f5c518]/30"
                disabled={isLoading}
              />
            </div>
            {newPhone && !KENYAN_PHONE_REGEX.test(newPhone) && (
              <p className="mt-1 text-xs text-red-400">
                Please enter a valid Kenyan phone number
              </p>
            )}
          </div>

          <div>
            <label
              className="block text-sm font-semibold text-white mb-2"
              htmlFor="password"
            >
              Password (to confirm)
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-[#31455f] bg-[#1a2332] text-white placeholder-[#7f93ae] outline-none transition focus:border-[#f5c518] focus:ring-2 focus:ring-[#f5c518]/30"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#31455f] bg-[#1a2332] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b1120]"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || isLoading}
              className="flex-1 rounded-xl bg-[#f5c518] px-4 py-2.5 text-sm font-semibold text-[#0b1120] transition hover:brightness-110 disabled:opacity-50"
            >
              {isLoading ? "Updating..." : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
