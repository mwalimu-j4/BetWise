import { useEffect, useState } from "react";
import { api } from "@/lib/axios";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  balance: number;
  isVerified: boolean;
  status: "active" | "suspended" | "banned";
  createdAt: string;
  updatedAt: string;
  totalBets: number;
}

export interface UserDetail extends User {
  role: string;
  bannedAt: string | null;
}

export interface GetUsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface UseUsersOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "suspended" | "banned" | "";
}

export function useUsers(options: UseUsersOptions = {}) {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(options.page || 1);
  const [limit, setLimit] = useState(options.limit || 50);

  const fetchUsers = async (
    searchTerm?: string,
    statusFilter?: string,
    pageNum?: number,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("page", String(pageNum || page));
      params.append("limit", String(limit));
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter) params.append("status", statusFilter);

      const response = await api.get<GetUsersResponse>(
        `/admin/users?${params}`,
      );
      setUsers(response.data.users);
      setTotal(response.data.total);
      setPage(response.data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(options.search, options.status);
  }, [options.search, options.status, options.page, options.limit]);

  return {
    users,
    total,
    page,
    limit,
    loading,
    error,
    fetchUsers,
    setPage,
    setLimit,
  };
}

export function useGetUserDetail(userId: string) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    setError(null);
    api
      .get<UserDetail>(`/admin/users/${userId}`)
      .then((response) => {
        setUser(response.data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to fetch user");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId]);

  return { user, loading, error };
}

export async function banUserAction(userId: string, reason?: string) {
  try {
    const response = await api.post(`/admin/users/${userId}/ban`, {
      reason: reason || "",
    });
    return response.data;
  } catch (err) {
    throw err instanceof Error ? err : new Error("Failed to ban user");
  }
}

export async function unbanUserAction(userId: string) {
  try {
    const response = await api.post(`/admin/users/${userId}/unban`);
    return response.data;
  } catch (err) {
    throw err instanceof Error ? err : new Error("Failed to unban user");
  }
}

export async function suspendUserAction(userId: string, reason?: string) {
  try {
    const response = await api.post(`/admin/users/${userId}/suspend`, {
      reason: reason || "",
    });
    return response.data;
  } catch (err) {
    throw err instanceof Error ? err : new Error("Failed to suspend user");
  }
}

export async function unsuspendUserAction(userId: string) {
  try {
    const response = await api.post(`/admin/users/${userId}/unsuspend`);
    return response.data;
  } catch (err) {
    throw err instanceof Error ? err : new Error("Failed to unsuspend user");
  }
}
