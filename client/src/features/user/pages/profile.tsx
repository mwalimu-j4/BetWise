import { useState, useMemo } from "react";
import {
  Wallet,
  Zap,
  Edit2,
  LogOut,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  User,
  Award,
  TrendingUp,
  History,
} from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import ProtectedRoute from "@/components/ProtectedRoute";
import EditPhoneModal from "@/components/profile/EditPhoneModal";
import ProfileSkeleton from "@/components/profile/ProfileSkeleton";
import { useProfile, useProfileTransactions } from "@/hooks/useProfile";
import { useAuth } from "@/context/AuthContext";
import { formatMoney } from "@/features/user/payments/data";

export default function UserProfilePage() {
  const navigate = useNavigate();
  const { logout, openAuthModal } = useAuth();
  const [editPhoneOpen, setEditPhoneOpen] = useState(false);

  const {
    data: profile,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useProfile();

  const { data: transactionsData, isLoading: transactionsLoading } =
    useProfileTransactions(true, 100, 1);

  const { totalDeposits, totalWithdrawals } = useMemo(() => {
    if (!transactionsData?.transactions) {
      return { totalDeposits: 0, totalWithdrawals: 0 };
    }

    let deposits = 0;
    let withdrawals = 0;

    transactionsData.transactions.forEach((tx) => {
      if (tx.status === "completed") {
        if (tx.type === "deposit") {
          deposits += tx.amount;
        } else if (tx.type === "withdrawal") {
          withdrawals += tx.amount;
        }
      }
    });

    return { totalDeposits: deposits, totalWithdrawals: withdrawals };
  }, [transactionsData]);

  const handleSignOut = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      openAuthModal("login");
      await navigate({ to: "/" });
    } catch (error) {
      toast.error("Failed to sign out");
      console.error(error);
    }
  };

  const memberSinceYear = profile?.createdAt
    ? new Date(profile.createdAt).getFullYear()
    : new Date().getFullYear();

  return (
    <ProtectedRoute requireRole="USER" redirectTo="/profile">
      <div className="min-h-screen bg-linear-to-br from-[#0a0f1a] via-[#0f172a] to-[#0a0f1a]">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">My Profile</h1>
              <p className="mt-1 text-sm text-gray-400">
                Manage your account and funds
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-[#1a2332] px-3 py-1.5">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-gray-300">Active</span>
            </div>
          </div>

          {profileLoading && !profile ? (
            <ProfileSkeleton />
          ) : profile ? (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="overflow-hidden rounded-2xl border border-[#2a3a4a] bg-linear-to-br from-[#111827] to-[#0f172a] shadow-xl">
                <div className="relative px-6 py-8">
                  <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-linear-to-br from-[#f5c518] to-[#d4a800] shadow-lg">
                        <span className="text-3xl font-bold text-black">
                          {profile.avatarLetter || "U"}
                        </span>
                      </div>
                      <div className="absolute -bottom-1 -right-1 rounded-full bg-green-500 p-1.5 ring-2 ring-[#0f172a]">
                        <div className="h-2 w-2 rounded-full bg-white" />
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 text-center md:text-left">
                      <h2 className="text-2xl font-bold text-white">
                        {profile.phoneMasked || "User"}
                      </h2>
                      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                        <div className="flex items-center gap-1.5 rounded-full bg-[#1a2332] px-3 py-1">
                          <User size={12} className="text-[#f5c518]" />
                          <span className="text-xs text-gray-300 capitalize">
                            {profile.status?.toLowerCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Edit Button */}
                    <button
                      onClick={() => setEditPhoneOpen(true)}
                      className="flex items-center gap-2 rounded-lg border border-[#f5c518]/30 bg-[#f5c518]/10 px-4 py-2 text-sm font-medium text-[#f5c518] transition hover:bg-[#f5c518]/20"
                    >
                      <Edit2 size={14} />
                      Edit Phone
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 border-t border-[#2a3a4a] bg-[#0a0f1a]/50">
                  <div className="border-r border-[#2a3a4a] p-5 text-center">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                      Balance
                    </p>
                    <p className="mt-2 text-2xl font-bold text-[#22c55e]">
                      {formatMoney(profile.balance)}
                    </p>
                  </div>
                  <div className="p-5 text-center">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                      Bonus
                    </p>
                    <p className="mt-2 text-2xl font-bold text-[#f5c518]">
                      {formatMoney(profile.bonus)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div className="rounded-2xl border border-[#2a3a4a] bg-linear-to-br from-[#1a2332] to-[#111827] p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5c518]/10">
                    <User size={20} className="text-[#f5c518]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Display Settings
                    </h3>
                    <p className="text-sm text-gray-400">
                      Customize your interface
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-[#0a0f1a]/50">
                  <div className="flex items-center gap-3">
                    <TrendingUp size={18} className="text-gray-400" />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Show Quick Navigation
                      </p>
                      <p className="text-xs text-gray-400">
                        Display the sports categories below the top bar
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const current =
                        localStorage.getItem("bc_show_sub_nav") !== "false";
                      const next = !current;
                      localStorage.setItem("bc_show_sub_nav", String(next));
                      window.dispatchEvent(new Event("storage")); // Trigger Navbar update
                      toast.success(
                        next
                          ? "Quick navigation enabled"
                          : "Quick navigation hidden",
                      );
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-hidden ${
                      localStorage.getItem("bc_show_sub_nav") !== "false"
                        ? "bg-[#f5c518]"
                        : "bg-gray-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localStorage.getItem("bc_show_sub_nav") !== "false"
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Quick Navigation Links */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Link
                  to="/user/payments/deposit"
                  className="group relative overflow-hidden rounded-2xl border border-[#2a3a4a] bg-linear-to-br from-[#1a2332] to-[#111827] p-6 transition-all hover:border-[#22c55e]/50 hover:shadow-lg"
                >
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#22c55e]/10 group-hover:bg-[#22c55e]/20 transition">
                        <ArrowUpRight size={24} className="text-[#22c55e]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          Deposit
                        </h3>
                        <p className="text-sm text-gray-400">
                          Add funds to your wallet
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      size={20}
                      className="text-gray-600 group-hover:text-[#22c55e] transition"
                    />
                  </div>
                </Link>

                <Link
                  to="/user/payments/withdrawal"
                  className="group relative overflow-hidden rounded-2xl border border-[#2a3a4a] bg-linear-to-br from-[#1a2332] to-[#111827] p-6 transition-all hover:border-[#f5c518]/50 hover:shadow-lg"
                >
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#f5c518]/10 group-hover:bg-[#f5c518]/20 transition">
                        <ArrowDownRight size={24} className="text-[#f5c518]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          Withdraw
                        </h3>
                        <p className="text-sm text-gray-400">
                          Cash out your winnings
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      size={20}
                      className="text-gray-600 group-hover:text-[#f5c518] transition"
                    />
                  </div>
                </Link>
              </div>

              {/* Quick Navigation */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Link
                  to="/user/bets"
                  search={{}}
                  className="group relative overflow-hidden rounded-2xl border border-[#2a3a4a] bg-linear-to-br from-[#1a2332] to-[#111827] p-6 transition-all hover:border-[#22c55e]/50 hover:shadow-lg"
                >
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#22c55e]/10 group-hover:bg-[#22c55e]/20 transition">
                        <TrendingUp size={24} className="text-[#22c55e]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          My Bets
                        </h3>
                        <p className="text-sm text-gray-400">
                          View your betting history
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      size={20}
                      className="text-gray-600 group-hover:text-[#22c55e] transition"
                    />
                  </div>
                </Link>

                <Link
                  to="/user/payments/history"
                  className="group relative overflow-hidden rounded-2xl border border-[#2a3a4a] bg-linear-to-br from-[#1a2332] to-[#111827] p-6 transition-all hover:border-[#f5c518]/50 hover:shadow-lg"
                >
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#f5c518]/10 group-hover:bg-[#f5c518]/20 transition">
                        <History size={24} className="text-[#f5c518]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          Transactions
                        </h3>
                        <p className="text-sm text-gray-400">
                          View transaction history
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      size={20}
                      className="text-gray-600 group-hover:text-[#f5c518] transition"
                    />
                  </div>
                </Link>
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-[#2a3a4a] bg-[#111827] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5c518]/10">
                      <Award size={14} className="text-[#f5c518]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Member Since</p>
                      <p className="text-sm font-semibold text-white">
                        {memberSinceYear}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#2a3a4a] bg-[#111827] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#22c55e]/10">
                      <Wallet size={14} className="text-[#22c55e]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Total Deposits</p>
                      <p className="text-sm font-semibold text-white">
                        {transactionsLoading
                          ? "Loading..."
                          : formatMoney(totalDeposits)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#2a3a4a] bg-[#111827] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5c518]/10">
                      <Zap size={14} className="text-[#f5c518]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Total Withdrawals</p>
                      <p className="text-sm font-semibold text-white">
                        {transactionsLoading
                          ? "Loading..."
                          : formatMoney(totalWithdrawals)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex min-h-96 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 p-8">
              <div className="text-center">
                <p className="text-red-300">Could not load profile data.</p>
                <button
                  onClick={() => {
                    toast.info("Retrying profile sync...");
                    void refetchProfile();
                  }}
                  className="mt-3 text-sm font-medium text-[#f5c518] underline hover:no-underline"
                >
                  Click to retry
                </button>
              </div>
            </div>
          )}
        </div>

        <EditPhoneModal
          isOpen={editPhoneOpen}
          currentPhone={profile?.phoneMasked || "07******"}
          onClose={() => setEditPhoneOpen(false)}
          onSuccess={() => {
            void refetchProfile();
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
