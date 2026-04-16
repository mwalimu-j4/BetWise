import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { BetCardSkeleton } from "@/components/my-bets/BetCardSkeleton";
import { BetDetailModal } from "@/components/my-bets/BetDetailModal";
import { useBetDetail } from "@/features/user/hooks/useBetDetail";
import { useCancelBet } from "@/features/user/hooks/useCancelBet";

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
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="absolute bottom-0 left-0 right-0 h-[90vh] rounded-t-2xl border-t border-[#31455f] bg-[#0f172a] md:bottom-6 md:left-auto md:right-6 md:top-6 md:h-auto md:w-[540px] md:rounded-2xl md:border"
        onClick={(event) => event.stopPropagation()}
      >
        {detail.isLoading || !detail.data ? (
          <div className="p-4">
            <BetCardSkeleton count={4} />
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
