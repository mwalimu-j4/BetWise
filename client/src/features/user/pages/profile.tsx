import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProfileHeader from "@/components/profile/ProfileHeader";
import BalanceCards from "@/components/profile/BalanceCards";
import PreferencesPanel from "@/components/profile/PreferencesPanel";
import ProfileSkeleton from "@/components/profile/ProfileSkeleton";
import SupportLinks from "@/components/profile/SupportLinks";
import TransactionPreview from "@/components/profile/TransactionPreview";
import WithdrawalForm from "@/components/profile/WithdrawalForm";
import { useProfile, useProfileTransactions } from "@/hooks/useProfile";
import { useAuth } from "@/context/AuthContext";

function QuickRow({
  label,
  description,
  to,
}: {
  label: string;
  description: string;
  to: string;
}) {
  return (
    <Link
      to={to as never}
      className="flex items-center justify-between rounded-lg border border-[#31455f] bg-[#0f172a] px-3 py-3"
    >
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-[#90a2bb]">{description}</p>
      </div>
      <ChevronRight size={16} className="text-[#f5c518]" />
    </Link>
  );
}

export default function UserProfilePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const {
    data: profile,
    isLoading: profileLoading,
    isFetching: profileRefreshing,
  } = useProfile();

  const [transactionsEnabled, setTransactionsEnabled] = useState(false);
  const {
    data: transactionsData,
    isLoading: transactionsLoading,
    isFetching: transactionsRefreshing,
    refetch: refetchTransactions,
  } = useProfileTransactions(transactionsEnabled, 5, 1);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setTransactionsEnabled(true);
    }, 600);

    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  const handleSignOut = async () => {
    await logout();
    await navigate({ to: "/" });
  };

  return (
    <ProtectedRoute requireRole="USER" redirectTo="/profile">
      <section className="mx-auto w-full max-w-[480px] space-y-4 font-admin">
        <ProfileHeader
          avatarLetter={profile?.avatarLetter ?? "U"}
          phoneMasked={profile?.phoneMasked ?? "07******"}
          status={profile?.status ?? "ACTIVE"}
        />

        {profileLoading && !profile ? <ProfileSkeleton /> : null}

        {profile ? (
          <>
            <BalanceCards
              balance={profile.balance}
              bonus={profile.bonus}
              live={profile.live}
            />

            <section className="rounded-2xl border border-[#2b3a4e] bg-[#1a2332] p-4">
              <h3 className="text-sm font-semibold text-white">
                Quick Actions
              </h3>
              <div className="mt-3 space-y-2">
                <QuickRow
                  label="Free Bets & Promotions"
                  description="Check active rewards and offers"
                  to="/user/coming-soon?feature=promotions"
                />
                <QuickRow
                  label="Jackpot Streaks & Token History"
                  description="Follow streaks and token updates"
                  to="/user/coming-soon?feature=streaks"
                />
              </div>
            </section>

            <section className="rounded-2xl border border-[#2b3a4e] bg-[#1a2332] p-4">
              <h3 className="text-sm font-semibold text-white">Deposit</h3>
              <p className="mt-1 text-xs text-[#95a6be]">
                Reuse the existing secure M-PESA deposit flow.
              </p>
              <Link
                to="/user/payments/deposit"
                className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#f5c518] text-sm font-semibold text-[#0d1117]"
              >
                Open Deposit
              </Link>
            </section>

            <WithdrawalForm
              onSuccess={() => {
                void refetchTransactions();
              }}
            />

            <TransactionPreview
              transactions={transactionsData?.transactions ?? []}
              isLoading={transactionsLoading && transactionsEnabled}
              isRefreshing={transactionsRefreshing}
              onRefresh={() => {
                setTransactionsEnabled(true);
                void refetchTransactions();
              }}
            />

            <PreferencesPanel preferences={profile.preferences} />

            <section className="rounded-2xl border border-[#2b3a4e] bg-[#1a2332] p-4">
              <h3 className="text-sm font-semibold text-white">
                Other Info & Preferences
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-[#31455f] bg-[#0f172a] p-3 text-[#9fb0c7]">
                  <p className="text-[11px] uppercase tracking-[0.1em]">
                    Wallet
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    Secure
                  </p>
                </div>
                <div className="rounded-lg border border-[#31455f] bg-[#0f172a] p-3 text-[#9fb0c7]">
                  <p className="text-[11px] uppercase tracking-[0.1em]">
                    Session
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {profileRefreshing ? "Syncing" : "Active"}
                  </p>
                </div>
              </div>
            </section>

            <SupportLinks onSignOut={handleSignOut} />

            <footer className="pb-20 text-center text-xs text-[#7f93ae] md:pb-4">
              Betika App 6.01
            </footer>
          </>
        ) : null}

        {!profileLoading && !profile ? (
          <div className="rounded-xl border border-[#5a222a] bg-[#2a1515] p-4 text-sm text-red-200">
            Could not load profile.
            <button
              type="button"
              className="ml-2 text-[#f5c518] underline"
              onClick={() => {
                toast.info("Retrying profile sync...");
                void navigate({ to: "/user/profile" });
              }}
            >
              Retry
            </button>
          </div>
        ) : null}

        <nav className="sr-only" aria-label="profile hints">
          <span>Home</span>
          <span>Live</span>
          <span>Bet Slip</span>
          <span>My Bets</span>
          <span>Profile</span>
        </nav>
      </section>
    </ProtectedRoute>
  );
}
