import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, AlertCircle, X, RotateCcw } from "lucide-react";

interface PaymentFeedbackModalProps {
  isOpen: boolean;
  status: "success" | "failed";
  title: string;
  message: string;
  onClose: () => void;
  onRetry?: () => void;
}

export function PaymentFeedbackModal({
  isOpen,
  status,
  title,
  message,
  onClose,
  onRetry,
}: PaymentFeedbackModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const isSuccess = status === "success";
  const bgGradient = isSuccess
    ? "from-[#1a2f3f] to-[#111d2e]"
    : "from-[#2f1a1a] to-[#111d2e]";
  const iconBgColor = isSuccess ? "#3b82f6" : "#ef4444";
  const buttonBgColor = isSuccess
    ? "bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] hover:from-[#6d28d9] hover:to-[#2563eb]"
    : "bg-red-600 hover:bg-red-700";

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className={`relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl bg-gradient-to-b ${bgGradient} border border-[#243a53] p-8 text-center shadow-2xl`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-[#243a53] rounded-lg transition"
          aria-label="Close modal"
        >
          <X size={20} className="text-[#8a9bb0]" />
        </button>

        <div className="flex justify-center mb-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${iconBgColor}20` }}
          >
            {isSuccess ? (
              <CheckCircle size={48} style={{ color: iconBgColor }} />
            ) : (
              <AlertCircle size={48} style={{ color: iconBgColor }} />
            )}
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">{title}</h2>
        <p className="text-[#8a9bb0] text-sm leading-relaxed mb-6">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className={`flex-1 py-3 rounded-xl font-semibold text-white transition ${buttonBgColor}`}
          >
            {isSuccess ? "Done" : "Close"}
          </button>
          {!isSuccess && onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] hover:from-[#6d28d9] hover:to-[#2563eb] transition flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} />
              Retry Payment
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
