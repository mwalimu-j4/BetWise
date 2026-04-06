import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/axiosConfig";

export interface NewsletterSubscriber {
  id: string;
  email: string;
  isActive: boolean;
  subscribedAt: string;
  unsubscribedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscribersResponse {
  message: string;
  data: {
    subscribers: NewsletterSubscriber[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export function useAdminNewsletter(page: number = 1, limit: number = 20, active: boolean = true) {
  return useQuery({
    queryKey: ["admin-newsletter", { page, limit, active }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("limit", String(limit));
      params.append("active", String(active));

      const { data } = await api.get<SubscribersResponse>(
        `/admin/newsletter/subscribers?${params.toString()}`,
      );

      return data.data;
    },
  });
}
