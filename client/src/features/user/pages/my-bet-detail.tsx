import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { BetCardSkeleton } from "@/components/my-bets/BetCardSkeleton";
import { BetDetailModal } from "@/components/my-bets/BetDetailModal";
import { useBetDetail } from "@/features/user/components/hooks/useBetDetail";
import { useCancelBet } from "@/features/user/components/hooks/useCancelBet";

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
        className="absolute bottom-0 left-0 right-0 flex max-h-[90vh] flex-col overflow-hidden rounded-t-3xl border-t border-[#1e3350] bg-gradient-to-br from-[#111d2e] via-[#0f1a2d] to-[#0d1624] shadow-[0_-8px_30px_rgba(0,0,0,0.4)] md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:h-auto md:max-h-[85vh] md:w-[540px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:border"
        onClick={(event) => event.stopPropagation()}
      >
        {detail.isLoading || !detail.data ? (
          <div className="p-6">
            <BetCardSkeleton count={3} />
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
