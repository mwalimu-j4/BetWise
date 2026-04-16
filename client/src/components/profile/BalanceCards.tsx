import { memo } from "react";
import { formatMoney } from "@/features/user/payments/data";

type BalanceCardsProps = {
  balance: number;
  bonus: number;
  live: boolean;
};

function BalanceCardsComponent({ balance, bonus, live }: BalanceCardsProps) {
  return (
    <section className="grid grid-cols-2 gap-3" aria-label="Balance cards">
      <article className="rounded-xl border border-[#31455f] bg-[#0f172a] p-4">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.12em] text-[#8a9bb0]">
            Balance
          </span>
          <span
            className={`h-2.5 w-2.5 rounded-full ${live ? "animate-pulse bg-[#22c55e]" : "bg-[#4b5563]"}`}
            aria-label={live ? "Live updates active" : "Live updates idle"}
          />
        </div>
        <p className="mt-2 text-lg font-bold text-[#22c55e]">
          {formatMoney(balance)}
        </p>
      </article>

      <article className="rounded-xl border border-[#31455f] bg-[#0f172a] p-4">
        <p className="text-xs uppercase tracking-[0.12em] text-[#8a9bb0]">
          Bonus
        </p>
        <p className="mt-2 text-lg font-bold text-[#f5c518]">
          {formatMoney(bonus)}
        </p>
      </article>
    </section>
  );
}

const BalanceCards = memo(BalanceCardsComponent);

export default BalanceCards;
