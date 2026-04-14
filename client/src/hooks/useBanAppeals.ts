import { useEffect, useState } from "react";
import { api } from "@/lib/axios";

export interface BanAppeal {
  id: string;
  userId: string;
  user?: {
    id: string;
    email: string;
    fullName: string;
    phone: string;
    bannedAt: string | null;
    banReason?: string;
  };
  appealText: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";
  responseText: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
}

// Admin hook to get all ban appeals
export function useAdminBanAppeals(
  page = 1,
  limit = 20,
  status?: string,
) {
  const [appeals, setAppeals] = useState<BanAppeal[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAppeals = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (status && status !== "all") {
        params.append("status", status);
      }

      const response = await api.get<{
        appeals: BanAppeal[];
        total: number;
        pages: number;
      }>(`/admin/appeals?${params}`);

      setAppeals(response.data.appeals);
      setTotal(response.data.total);
      setPages(response.data.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch appeals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAppeals();
  }, [page, limit, status]);

  return { appeals, total, pages, loading, error, refetch: fetchAppeals };
}

// Admin hook to get single appeal detail
export function useAdminBanAppealDetail(appealId: string) {
  const [appeal, setAppeal] = useState<BanAppeal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appealId) return;

    setLoading(true);
    setError(null);

    api
      .get<BanAppeal>(`/admin/appeals/${appealId}`)
      .then((response) => {
        setAppeal(response.data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to fetch appeal");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [appealId]);

  return { appeal, loading, error };
}

// User hook to get their appeals
export function useMyBanAppeals() {
  const [appeals, setAppeals] = useState<BanAppeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAppeals = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ appeals: BanAppeal[] }>(
        "/appeals/my",
      );
      setAppeals(response.data.appeals);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch appeals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAppeals();
  }, []);

  return { appeals, loading, error, refetch: fetchAppeals };
}

// Create a ban appeal
export async function createBanAppealAction(appealText: string) {
  const response = await api.post("/appeals", { appealText });
  return response.data;
}

// Respond to appeal (admin)
export async function respondToBanAppealAction(
  appealId: string,
  action: "APPROVE" | "REJECT",
  responseText: string,
) {
  const response = await api.post(`/admin/appeals/${appealId}/respond`, {
    action,
    responseText,
  });
  return response.data;
}

// Withdraw appeal
export async function withdrawBanAppealAction(appealId: string) {
  const response = await api.post(`/appeals/${appealId}/withdraw`);
  return response.data;
}
