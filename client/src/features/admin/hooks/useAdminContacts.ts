import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/axiosConfig";

export interface Contact {
  id: string;
  subject: string;
  message: string;
  fullName: string;
  phone: string;
  status: "SUBMITTED" | "READ" | "RESOLVED";
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    phone: string;
    fullName?: string;
  } | null;
}

export interface ContactsResponse {
  contacts: Contact[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export function useAdminContacts(
  limit: number = 20,
  skip: number = 0,
  status?: string,
  search?: string,
) {
  return useQuery({
    queryKey: ["admin-contacts", { limit, skip, status, search }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", String(Math.floor(skip / limit) + 1));
      params.append("limit", String(limit));
      if (status && status !== "all") {
        params.append("status", status);
      }
      if (search) {
        params.append("search", search);
      }

      const { data } = await api.get<ContactsResponse>(
        `/admin/contact?${params.toString()}`,
      );
      return data;
    },
  });
}

export function useUpdateContactStatus(contactId: string, newStatus: string) {
  return useQuery({
    queryKey: ["update-contact-status", contactId, newStatus],
    queryFn: async () => {
      const { data } = await api.patch(`/admin/contact/${contactId}`, {
        status: newStatus,
      });
      return data;
    },
    enabled: false,
  });
}
