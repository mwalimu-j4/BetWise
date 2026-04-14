import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { createBanAppealAction } from "@/hooks/useUsers";
import { toast } from "sonner";

interface BanAppealModalProps {
  open: boolean;
  appealToken: string | null;
  banReason: string | null;
  onClose: () => void;
}

export const BanAppealModal: React.FC<BanAppealModalProps> = ({
  open,
  appealToken,
  banReason,
  onClose,
}) => {
  const [appealText, setAppealText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealToken) return;
    if (appealText.trim().length < 10) {
      toast.error("Appeal must be at least 10 characters.");
      return;
    }
    setLoading(true);
    try {
      await createBanAppealAction(appealToken, appealText.trim());
      toast.success(
        "Appeal submitted successfully. We'll review your case soon.",
      );
      setAppealText("");
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit appeal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogTitle>Ban Appeal</DialogTitle>
        {banReason && (
          <div className="mb-2 rounded bg-red-100/10 p-2 text-red-400 text-sm">
            <strong>Ban Reason:</strong> {banReason}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            className="w-full rounded border border-gray-700 bg-black/30 p-2 text-sm text-white min-h-20"
            placeholder="Explain why you believe your ban should be lifted..."
            value={appealText}
            onChange={(e) => setAppealText(e.target.value)}
            minLength={10}
            required
            disabled={loading}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-700 text-white font-semibold"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit Appeal"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BanAppealModal;
