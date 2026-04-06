import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  Zap,
  Users,
  TrendingUp,
  Lock,
  Smartphone,
} from "lucide-react";
import { Card } from "@/components/ui/card";

interface Step {
  number: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export default function HowItWorks() {
  const navigate = useNavigate();
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const steps: Step[] = [
    {
      number: 1,
      icon: Smartphone,
      title: "Sign Up",
      description:
        "Create your account with your email and password, then complete your profile setup to get started.",
    },
    {
      number: 2,
      icon: Users,
      title: "Add Funds",
      description:
        "Deposit funds using M-Pesa for instant wallet credit. Start with any amount that suits your budget.",
    },
    {
      number: 3,
      icon: TrendingUp,
      title: "Browse Events",
      description:
        "Explore upcoming sports events across multiple leagues and carefully compare competitive odds.",
    },
    {
      number: 4,
      icon: Zap,
      title: "Place Bet",
      description:
        "Select your bets, set your stake amount, review the details, and place your bet confidently.",
    },
    {
      number: 5,
      icon: Lock,
      title: "Track & Win",
      description:
        "Monitor your active bets in real-time and automatically receive your winnings to your wallet.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1120] to-[#0f172a] text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold mb-4">How BetRixPro Works</h1>
          <p className="text-base text-[#90a2bb] max-w-2xl mx-auto leading-relaxed">
            Get started with sports betting in just a few simple steps. Follow
            our guide to learn how to make the most of your BetRixPro
            experience.
          </p>
        </div>

        {/* Steps Section */}
        <div className="mb-20">
          <h2 className="mb-10 text-3xl font-bold text-center">5 Easy Steps</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {steps.map((step) => {
              const Icon = step.icon;
              const isExpanded = expandedStep === step.number;

              return (
                <Card
                  key={step.number}
                  className="overflow-hidden border border-[#31455f] bg-[#0f172a] rounded-2xl"
                >
                  <button
                    onClick={() =>
                      setExpandedStep(isExpanded ? null : step.number)
                    }
                    className="w-full px-6 py-6 text-left"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#f5c518] flex-shrink-0">
                          <Icon className="h-7 w-7 text-[#0b1120]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#f5c518] uppercase tracking-wide">
                            Step {step.number}
                          </p>
                          <p className="text-lg font-bold text-white truncate">
                            {step.title}
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`h-6 w-6 text-[#f5c518] transition-all duration-300 flex-shrink-0 hover:scale-110 cursor-pointer ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-[#31455f] bg-[#0c1018] px-6 py-5 animate-in fade-in duration-200">
                      <p className="text-base text-[#90a2bb] leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center rounded-2xl border border-[#31455f] bg-[#0f172a] p-10">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-base text-[#90a2bb] mb-8 max-w-2xl mx-auto leading-relaxed">
            Join thousands of sports enthusiasts. Sign up and start betting
            today with secure M-Pesa deposits and a world-class betting
            experience on BetRixPro.
          </p>
          <button
            onClick={() => navigate({ to: "/user" })}
            className="inline-block rounded-xl bg-gradient-to-r from-[#f5c518] to-[#d4a500] px-10 py-3 font-bold text-[#0b1120] hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            Start Betting Now
          </button>
        </div>
      </div>
    </div>
  );
}
