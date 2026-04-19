import { BetDetailModal } from "@/components/my-bets/BetDetailModal";
import { useBetDetail } from "@/features/user/components/hooks/useBetDetail";
import { useCancelBet } from "@/features/user/components/hooks/useCancelBet";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";

export default function MyBetDetailPage() {
  const navigate = useNavigate();
  const { betId } = useParams({ strict: false }) as { betId: string };
  const search = useSearch({ strict: false }) as {
    tab?: string;
    filter?: string;
    page?: string;
  };

  const detail = useBetDetail(betId);
  const cancelBet = useCancelBet();

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleClose = () => {
    void navigate({
      to: "/user/bets",
      search: {
        tab: search.tab,
        filter: search.filter,
        page: search.page,
      },
      replace: true,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6"
      onClick={handleClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-[540px] flex-col overflow-hidden rounded-3xl border border-[#1e3350] bg-gradient-to-br from-[#111d2e] via-[#0f1a2d] to-[#0d1624] shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        onClick={(event) => event.stopPropagation()}
      >
        {detail.isLoading || !detail.data ? (
          <div className="p-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1e3350] border-t-amber-400" />
              <p className="text-sm font-medium text-[#6b86a8]">Loading bet details...</p>
            </div>
          </div>
        ) : (
          <BetDetailModal
            bet={detail.data}
            integrityError={detail.integrityError}
            onClose={handleClose}
            onCancel={() => {
              cancelBet.mutate(betId, {
                onSuccess: () => {
                  toast.success("Bet cancelled successfully");
                  handleClose();
                },
                onError: () => {
                  toast.error("Unable to cancel this bet");
                },
              });
            }}
            isCancelling={cancelBet.isPending}
          />
        )}
      </div>
    </div>
  );
}
