import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle, ShieldAlert, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/api/axiosConfig";
import { useAuth } from "@/context/AuthContext";

type SupportLinksProps = {
  onSignOut: () => Promise<void>;
};

export default function SupportLinks({ onSignOut }: SupportLinksProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { logout, openAuthModal } = useAuth();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.post("/profile/delete-account", { password });
    },
    onSuccess: async () => {
      toast.success("Account deleted successfully.");
      await logout();
      toast.success("Logged out successfully");
      openAuthModal("login");
      await navigate({ to: "/" });
    },
    onError: (error: unknown) => {
      const apiMessage = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      toast.error(
        typeof apiMessage === "string"
          ? apiMessage
          : "Failed to delete account.",
      );
    },
  });

  return (
    <>
      <section className="rounded-2xl border border-[#2b3a4e] bg-[#1a2332] p-4">
        <h3 className="text-sm font-semibold text-white">Support</h3>

        <div className="mt-3 space-y-2">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg border border-[#31455f] bg-[#0f172a] px-3 py-2 text-left text-sm text-white"
            onClick={() => toast.info("Live chat will open soon.")}
          >
            <MessageCircle size={14} className="text-[#22c55e]" />
            Live Chat
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg border border-[#5a2d2d] bg-[#2a1616] px-3 py-2 text-left text-sm text-[#fecaca]"
            onClick={() => setDialogOpen(true)}
          >
            <Trash2 size={14} />
            Delete Account
          </button>

          <Link
            to="/user/coming-soon"
            search={{ feature: "responsible-gaming" }}
            className="flex w-full items-center gap-2 rounded-lg border border-[#31455f] bg-[#0f172a] px-3 py-2 text-left text-sm text-white"
          >
            <ShieldAlert size={14} className="text-[#f5c518]" />
            Responsible Gaming
          </Link>
        </div>

        <button
          type="button"
          className="mt-4 h-11 w-full rounded-xl bg-[#ef4444] text-sm font-semibold text-white transition hover:brightness-95"
          onClick={() => {
            void onSignOut();
          }}
        >
          Sign Out
        </button>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-[#31455f] bg-[#111827] text-white">
          <DialogHeader>
            <DialogTitle>Confirm Account Deletion</DialogTitle>
            <DialogDescription className="text-[#9fb0c7]">
              Enter your password to permanently delete your account.
            </DialogDescription>
          </DialogHeader>

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 w-full rounded-lg border border-[#31455f] bg-[#0f172a] px-3 text-sm text-white outline-none focus:border-[#f5c518]"
            placeholder="Enter your password"
          />

          <DialogFooter>
            <button
              type="button"
              className="h-10 rounded-lg border border-[#31455f] px-4 text-sm text-[#c4d1e1]"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending || password.trim().length < 8}
              className="h-10 rounded-lg bg-[#ef4444] px-4 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() => {
                void deleteMutation.mutateAsync();
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Account"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
