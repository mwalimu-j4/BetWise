import { CheckCircle, AlertCircle, X } from "lucide-react";

interface PaymentFeedbackModalProps {
  isOpen: boolean;
  status: "success" | "failed";
  title: string;
  message: string;
  reference?: string;
  onClose: () => void;
}

export function PaymentFeedbackModal({
  isOpen,
  status,
  title,
  message,
  reference,
  onClose,
}: PaymentFeedbackModalProps) {
  if (!isOpen) return null;

  const isSuccess = status === "success";
  const bgGradient = isSuccess
    ? "from-[#1a2f3f] to-[#111d2e]"
    : "from-[#2f1a1a] to-[#111d2e]";
  const iconBgColor = isSuccess ? "#3b82f6" : "#ef4444";
  const buttonBgColor = isSuccess
    ? "bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] hover:from-[#6d28d9] hover:to-[#2563eb]"
    : "bg-red-600 hover:bg-red-700";

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`relative w-full max-w-sm rounded-3xl bg-gradient-to-b ${bgGradient} border border-[#243a53] p-8 text-center shadow-2xl`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-[#243a53] rounded-lg transition"
        >
          <X size={20} className="text-[#8a9bb0]" />
        </button>

        {/* Icon */}
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

        {/* Title */}
        <h2 className="text-2xl font-bold text-white mb-3">{title}</h2>

        {/* Message */}
        <p className="text-[#8a9bb0] text-sm leading-relaxed mb-6">{message}</p>

        {/* Reference */}
        {reference && (
          <div className="mb-6 p-3 rounded-lg bg-[#0f1a2a] border border-[#243a53]">
            <p className="text-xs text-[#62738a] mb-1">Reference</p>
            <p className="text-sm font-mono text-[#f5c518]">{reference}</p>
          </div>
        )}

        {/* Ok button */}
        <button
          onClick={onClose}
          className={`w-full py-3 rounded-xl font-semibold text-white transition ${buttonBgColor}`}
        >
          Okay
        </button>
      </div>
    </div>
  );
}
