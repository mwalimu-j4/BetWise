import type { MyBetTab } from "@/features/user/components/hooks/useMyBets";

const tabs: Array<{ label: string; value: MyBetTab }> = [
  { label: "Normal", value: "normal" },
  { label: "Shilisha", value: "shilisha" },
  { label: "Jackpot", value: "jackpot" },
  { label: "Virtual", value: "virtual" },
  { label: "Sababisha", value: "sababisha" },
  { label: "Custom", value: "custom" },
];

type BetsTabsProps = {
  activeTab: MyBetTab;
  onTabChange: (tab: MyBetTab) => void;
};

export function BetsTabs({ activeTab, onTabChange }: BetsTabsProps) {
  return (
    <div className="app-scrollbar sticky top-0 z-20 overflow-x-auto border-b border-[#243247] bg-[#0d1117]/95 px-2 py-1 backdrop-blur">
      <div className="flex min-w-max items-center gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              className={`relative rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-[#1f2a3a] text-[#F5C518]"
                  : "text-[#93a4ba] hover:text-white"
              }`}
              onClick={() => onTabChange(tab.value)}
            >
              {tab.label}
              <span
                className={`absolute inset-x-2 -bottom-1 h-[2px] rounded-full transition ${
                  isActive ? "bg-[#F5C518]" : "bg-transparent"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
