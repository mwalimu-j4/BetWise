import { LoaderCircle } from "lucide-react";

interface PaymentLoadingModalProps {
  isOpen: boolean;
  amount?: number;
  message?: string;
}

export function PaymentLoadingModal({
  isOpen,
  amount,
  message = "Processing your payment",
}: PaymentLoadingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Backdrop - ensures nothing else is interactive */}
      <div className="absolute inset-0 z-40" />

      {/* Modal */}
      <div className="relative z-50 w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#1a2f3f] to-[#111d2e] border border-[#243a53] p-8 text-center shadow-2xl">
        {/* Loading Animation */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full flex items-center justify-center bg-gradient-to-br from-[#3b82f6]/20 to-[#7c3aed]/20">
            <LoaderCircle
              size={56}
              className="text-[#3b82f6] animate-spin"
              strokeWidth={1.5}
            />
          </div>
        </div>

        {/* Message */}
        <h2 className="text-xl font-bold text-white mb-2">{message}</h2>

        {/* Amount Display */}
        {amount && (
          <p className="text-sm text-[#8a9bb0] mb-4">
            Amount:{" "}
            <span className="text-[#f5c518] font-semibold">
              KES {amount.toLocaleString()}
            </span>
          </p>
        )}

        {/* Loading dots animation */}
        <div className="flex justify-center gap-2 mt-6">
          <div
            className="w-2 h-2 rounded-full bg-[#3b82f6] animate-bounce"
            style={{ animationDelay: "0s" }}
          />
          <div
            className="w-2 h-2 rounded-full bg-[#7c3aed] animate-bounce"
            style={{ animationDelay: "0.1s" }}
          />
          <div
            className="w-2 h-2 rounded-full bg-[#3b82f6] animate-bounce"
            style={{ animationDelay: "0.2s" }}
          />
        </div>

        {/* Subtle helper text */}
        <p className="text-xs text-[#62738a] mt-6">
          Do not refresh or leave this page
        </p>
      </div>
    </div>
  );
}
