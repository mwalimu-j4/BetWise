import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/axiosConfig";

const csrfStorageKey = "betixpro-csrf-token";

function getCsrfToken() {
  if (typeof window === "undefined") {
    return "";
  }

  const existingToken = window.localStorage.getItem(csrfStorageKey);
  if (existingToken) {
    return existingToken;
  }

  const token = window.crypto.randomUUID();
  window.localStorage.setItem(csrfStorageKey, token);
  return token;
}

export function useCancelBet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (betId: string) => {
      const { data } = await api.post(
        `/my-bets/${betId}/cancel`,
        {},
        {
          headers: {
            "x-csrf-token": getCsrfToken(),
          },
        },
      );

      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-bets"] });
      void queryClient.invalidateQueries({ queryKey: ["my-bet-detail"] });
    },
  });
}
