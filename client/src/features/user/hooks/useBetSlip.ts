import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { api } from "@/api/axiosConfig";
import { useAuth } from "@/context/AuthContext";
import { myBetsNavbarCountQueryKey } from "@/features/user/hooks/useMyBets";
import { walletSummaryQueryKey } from "@/features/user/payments/wallet";

export interface BetSelection {
  eventId: string;
  eventName: string;
  leagueName: string;
  marketType: string;
  side: string;
  odds: number;
  commenceTime: string;
}

type PlaceBetResponse = {
  success: boolean;
  bet: {
    id: string;
    stake: number;
    displayOdds: number;
    potentialPayout: number;
    status: string;
  };
  newBalance: number;
};

type PlaceBetErrorResponse = {
  error?: string;
  message?: string;
  code?: string;
  newOdds?: number | null;
};

type StoredSlip = {
  selections: BetSelection[];
  stake: number;
};

type WalletSummaryCache = {
  balance?: number;
  wallet?: {
    balance: number;
    totalDepositsThisMonth: number;
  };
  transactions?: unknown[];
};

const pendingSlipStorageKey = "betixpro.pending-bet-slip";
export const betSlipCountStorageKey = "betixpro.bet-slip-count";
export const betSlipCountEventName = "betixpro:slip-count-changed";
export const betSlipToggleEventName = "betixpro:toggle-betslip";

function getErrorMessage(error: unknown) {
  if (isAxiosError<{ error?: string; message?: string }>(error)) {
    return (
      error.response?.data?.error ||
      error.response?.data?.message ||
      "We couldn't place your bet right now."
    );
  }

  return "We couldn't place your bet right now.";
}

function getReturnUrl() {
  if (typeof window === "undefined") {
    return "/user";
  }

  return `${window.location.pathname}${window.location.search}`;
}

function persistPendingSlip(payload: StoredSlip) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(pendingSlipStorageKey, JSON.stringify(payload));
}

function clearPendingSlip() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(pendingSlipStorageKey);
}

export function useBetSlip() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [selections, setSelections] = useState<BetSelection[]>([]);
  const [stake, setStakeState] = useState(50);
  const [isOpen, setIsOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newBalance, setNewBalance] = useState<number | null>(null);

  const setStake = useCallback((nextStake: number) => {
    setSuccess(false);
    setError(null);
    setStakeState(Number.isFinite(nextStake) ? Math.max(0, nextStake) : 0);
  }, []);

  const addSelection = useCallback((selection: BetSelection) => {
    setSelections((current) => {
      const existingForEvent = current.find(
        (item) => item.eventId === selection.eventId,
      );

      if (existingForEvent?.side === selection.side) {
        return current.filter((item) => item.eventId !== selection.eventId);
      }

      if (existingForEvent) {
        return current.map((item) =>
          item.eventId === selection.eventId ? selection : item,
        );
      }

      return [...current, selection];
    });

    setSuccess(false);
    setError(null);
    setNewBalance(null);
    setIsOpen(true);
  }, []);

  const removeSelection = useCallback((eventId: string) => {
    setSelections((current) =>
      current.filter((item) => item.eventId !== eventId),
    );
    setSuccess(false);
    setError(null);
    setNewBalance(null);
  }, []);

  const clearSlip = useCallback(() => {
    setSelections([]);
    setStakeState(50);
    setError(null);
    clearPendingSlip();
  }, []);

  const redirectToLogin = useCallback(() => {
    persistPendingSlip({ selections, stake });
    window.location.assign(
      `/login?redirect=${encodeURIComponent(getReturnUrl())}`,
    );
  }, [selections, stake]);

  const placeBet = useCallback(async () => {
    if (selections.length === 0) {
      setError("Choose at least one outcome first.");
      return;
    }

    if (!isAuthenticated) {
      redirectToLogin();
      return;
    }

    if (stake < 50) {
      setError("Minimum stake is KES 50.");
      return;
    }

    if (stake > 100000) {
      setError("Maximum stake is KES 100,000.");
      return;
    }

    setPlacing(true);
    setError(null);
    setSuccess(false);

    try {
      let latestBalance: number | null = null;

      for (const selection of selections) {
        try {
          const { data } = await api.post<PlaceBetResponse>(
            "/user/bets/place",
            {
              eventId: selection.eventId,
              marketType: selection.marketType,
              side: selection.side,
              stake,
              odds: selection.odds,
              confirmOddsChange: false,
            },
          );

          latestBalance = data.newBalance;
        } catch (attemptError) {
          if (isAxiosError<PlaceBetErrorResponse>(attemptError)) {
            if (attemptError.response?.status === 401) {
              redirectToLogin();
              return;
            }

            const payload = attemptError.response?.data;
            if (
              attemptError.response?.status === 409 &&
              payload?.code === "ODDS_CHANGED" &&
              typeof payload.newOdds === "number"
            ) {
              const confirmed = window.confirm(
                payload.error ??
                  `Odds have changed. New odds: ${payload.newOdds.toFixed(2)}. Do you want to proceed?`,
              );

              if (!confirmed) {
                setError(
                  "Bet placement cancelled. Please review updated odds.",
                );
                return;
              }

              const { data } = await api.post<PlaceBetResponse>(
                "/user/bets/place",
                {
                  eventId: selection.eventId,
                  marketType: selection.marketType,
                  side: selection.side,
                  stake,
                  odds: payload.newOdds,
                  confirmOddsChange: true,
                },
              );

              latestBalance = data.newBalance;
              continue;
            }
          }

          throw attemptError;
        }
      }

      if (latestBalance !== null) {
        queryClient.setQueryData<WalletSummaryCache | undefined>(
          walletSummaryQueryKey,
          (current) => {
            if (!current) {
              return {
                balance: latestBalance,
                wallet: {
                  balance: latestBalance,
                  totalDepositsThisMonth: 0,
                },
                transactions: [],
              };
            }

            return {
              ...current,
              balance: latestBalance,
              wallet: current.wallet
                ? {
                    ...current.wallet,
                    balance: latestBalance,
                  }
                : {
                    balance: latestBalance,
                    totalDepositsThisMonth: 0,
                  },
            };
          },
        );

        setNewBalance(latestBalance);
      }

      setSuccess(true);
      toast.success(
        `${selections.length} bet${selections.length === 1 ? "" : "s"} placed successfully.`,
      );
      clearSlip();
      setIsOpen(true);
      void queryClient.invalidateQueries({ queryKey: walletSummaryQueryKey });
      void queryClient.invalidateQueries({
        queryKey: myBetsNavbarCountQueryKey,
      });
    } catch (placeError) {
      if (isAxiosError(placeError) && placeError.response?.status === 401) {
        redirectToLogin();
        return;
      }

      const message = getErrorMessage(placeError);
      setError(message);
      toast.error(message);
    } finally {
      setPlacing(false);
    }
  }, [
    clearSlip,
    isAuthenticated,
    queryClient,
    redirectToLogin,
    selections,
    stake,
  ]);

  useEffect(() => {
    if (selections.length > 0) {
      setIsOpen(true);
    }
  }, [selections.length]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(
      betSlipCountStorageKey,
      String(selections.length),
    );

    window.dispatchEvent(
      new CustomEvent(betSlipCountEventName, {
        detail: { count: selections.length },
      }),
    );
  }, [selections.length]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedValue = window.sessionStorage.getItem(pendingSlipStorageKey);
    if (!storedValue) {
      return;
    }

    try {
      const parsed = JSON.parse(storedValue) as StoredSlip;
      if (Array.isArray(parsed.selections) && parsed.selections.length > 0) {
        setSelections(parsed.selections);
      }

      if (typeof parsed.stake === "number" && Number.isFinite(parsed.stake)) {
        setStakeState(parsed.stake);
      }
    } catch {
      // Ignore invalid persisted state.
    } finally {
      clearPendingSlip();
    }
  }, []);

  const potentialPayout = useMemo(() => {
    return (
      Math.round(
        selections.reduce(
          (total, selection) => total + stake * selection.odds,
          0,
        ) * 100,
      ) / 100
    );
  }, [selections, stake]);

  return {
    selections,
    addSelection,
    removeSelection,
    clearSlip,
    stake,
    setStake,
    potentialPayout,
    isOpen,
    setIsOpen,
    placeBet,
    placing,
    error,
    success,
    newBalance,
    isAuthenticated,
  };
}

export type UseBetSlipReturn = ReturnType<typeof useBetSlip>;

export default useBetSlip;
