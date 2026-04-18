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
  isCustomEvent?: boolean;
  customSelectionId?: string;
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
const activeSlipStorageKey = "betixpro.active-bet-slip.v1";
export const betSlipCountStorageKey = "betixpro.bet-slip-count";
export const betSlipCountEventName = "betixpro:slip-count-changed";
export const betSlipToggleEventName = "betixpro:toggle-betslip";

function isValidStoredSelection(value: unknown): value is BetSelection {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<BetSelection>;
  return (
    typeof candidate.eventId === "string" &&
    candidate.eventId.length > 0 &&
    typeof candidate.eventName === "string" &&
    typeof candidate.marketType === "string" &&
    typeof candidate.side === "string" &&
    typeof candidate.odds === "number" &&
    Number.isFinite(candidate.odds) &&
    typeof candidate.commenceTime === "string"
  );
}

export function isSelectionExpired(selection: BetSelection) {
  const commenceTimeMs = new Date(selection.commenceTime).getTime();
  if (!Number.isFinite(commenceTimeMs)) {
    return false;
  }

  return commenceTimeMs <= Date.now();
}

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

function persistPendingSlip(payload: StoredSlip) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(pendingSlipStorageKey, JSON.stringify(payload));
}

function persistActiveSlip(payload: StoredSlip) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(activeSlipStorageKey, JSON.stringify(payload));
}

function clearActiveSlip() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(activeSlipStorageKey);
}

function clearPendingSlip() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(pendingSlipStorageKey);
}

export function useBetSlip() {
  const { isAuthenticated, openAuthModal } = useAuth();
  const queryClient = useQueryClient();
  const [selections, setSelections] = useState<BetSelection[]>([]);
  const [stake, setStakeState] = useState(50);
  const [isOpen, setIsOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newBalance, setNewBalance] = useState<number | null>(null);
  const [hasHydratedSlip, setHasHydratedSlip] = useState(false);

  const setStake = useCallback((nextStake: number) => {
    setSuccess(false);
    setError(null);
    setStakeState(Number.isFinite(nextStake) ? Math.max(0, nextStake) : 0);
  }, []);

  const addSelection = useCallback((selection: BetSelection) => {
    if (isSelectionExpired(selection)) {
      setError("This selection has expired. Remove it or pick another event.");
      setSuccess(false);
      setIsOpen(true);
      return;
    }

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
    clearActiveSlip();
    clearPendingSlip();
  }, []);

  const redirectToLogin = useCallback(() => {
    persistPendingSlip({ selections, stake });
    openAuthModal("login");
  }, [openAuthModal, selections, stake]);

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

    const expiredSelections = selections.filter(isSelectionExpired);
    if (expiredSelections.length > 0) {
      const firstExpired = expiredSelections[0];
      setError(
        `Expired selection: ${firstExpired.eventName}. Remove expired selections before placing your bet.`,
      );
      setSuccess(false);
      setIsOpen(true);
      return;
    }

    setPlacing(true);
    setError(null);
    setSuccess(false);

    try {
      let latestBalance: number | null = null;

      for (const selection of selections) {
        try {
          // Route to custom events endpoint if it's a custom event bet
          const isCustom =
            selection.isCustomEvent && selection.customSelectionId;

          const { data } = isCustom
            ? await api.post<PlaceBetResponse>(
                `/user/custom-events/${selection.eventId}/bet`,
                {
                  selectionId: selection.customSelectionId,
                  stake,
                },
              )
            : await api.post<PlaceBetResponse>("/user/bets/place", {
                eventId: selection.eventId,
                marketType: selection.marketType,
                side: selection.side,
                stake,
                odds: selection.odds,
                confirmOddsChange: false,
              });

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

    if (!hasHydratedSlip) {
      return;
    }

    if (selections.length === 0) {
      clearActiveSlip();
      return;
    }

    persistActiveSlip({ selections, stake });
  }, [hasHydratedSlip, selections, stake]);

  useEffect(() => {
    if (typeof window === "undefined") {
      setHasHydratedSlip(true);
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

    const hydrateFromStorage = (storedValue: string | null) => {
      if (!storedValue) {
        return false;
      }

      try {
        const parsed = JSON.parse(storedValue) as Partial<StoredSlip>;
        if (Array.isArray(parsed.selections)) {
          const safeSelections = parsed.selections.filter(
            isValidStoredSelection,
          );
          if (safeSelections.length > 0) {
            setSelections(safeSelections);
          }
        }

        if (typeof parsed.stake === "number" && Number.isFinite(parsed.stake)) {
          setStakeState(Math.max(0, parsed.stake));
        }

        return true;
      } catch {
        return false;
      }
    };

    const hasActiveSlip = hydrateFromStorage(
      window.localStorage.getItem(activeSlipStorageKey),
    );

    if (hasActiveSlip) {
      return;
    }

    const hadPendingSlip = hydrateFromStorage(
      window.sessionStorage.getItem(pendingSlipStorageKey),
    );

    if (hadPendingSlip) {
      clearPendingSlip();
    }

    setHasHydratedSlip(true);
  }, []);

  const expiredSelections = useMemo(
    () => selections.filter(isSelectionExpired),
    [selections],
  );

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
    expiredSelections,
    hasExpiredSelections: expiredSelections.length > 0,
  };
}

export type UseBetSlipReturn = ReturnType<typeof useBetSlip>;

export default useBetSlip;
