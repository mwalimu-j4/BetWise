import { useState } from "react";
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

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export default function HowItWorks() {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const steps: Step[] = [
    {
      number: 1,
      icon: Smartphone,
      title: "Sign Up",
      description: "Create your account with email and password.",
    },
    {
      number: 2,
      icon: Users,
      title: "Add Funds",
      description: "Deposit using M-Pesa for instant wallet credit.",
    },
    {
      number: 3,
      icon: TrendingUp,
      title: "Browse Events",
      description: "Explore sports events and compare odds.",
    },
    {
      number: 4,
      icon: Zap,
      title: "Place Bet",
      description: "Select odds, enter stake, and confirm bet.",
    },
    {
      number: 5,
      icon: Lock,
      title: "Track & Win",
      description: "Monitor bets in real-time and collect winnings.",
    },
  ];

  const features: Feature[] = [
    {
      icon: Zap,
      title: "Fast & Easy",
      description: "Quick and intuitive betting experience.",
    },
    {
      icon: Lock,
      title: "Secure",
      description: "SSL encryption and secure transactions.",
    },
    {
      icon: TrendingUp,
      title: "Best Odds",
      description: "Competitive odds on all events.",
    },
    {
      icon: Users,
      title: "Live Betting",
      description: "Bet on live events in real-time.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1120] to-[#0f172a] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold mb-2">How BetWise Works</h1>
          <p className="text-sm text-[#90a2bb] max-w-2xl mx-auto">
            Get started with sports betting in just a few simple steps.
          </p>
        </div>

        {/* Steps Section */}
        <div className="mb-12">
          <h2 className="mb-6 text-xl font-bold text-center">5 Easy Steps</h2>
          <div className="space-y-2">
            {steps.map((step) => {
              const Icon = step.icon;
              const isExpanded = expandedStep === step.number;

              return (
                <Card
                  key={step.number}
                  className="overflow-hidden border-[#31455f] bg-[#0f172a]"
                >
                  <button
                    onClick={() =>
                      setExpandedStep(isExpanded ? null : step.number)
                    }
                    className="w-full px-4 py-3 text-left hover:bg-[#1a2a3a] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-[#f5c518]">
                          <Icon className="h-5 w-5 text-[#0b1120]" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#f5c518]">
                            Step {step.number}
                          </p>
                          <p className="text-sm font-bold text-white">
                            {step.title}
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-[#f5c518] transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-[#31455f] bg-[#0c1018] px-4 py-3">
                      <p className="text-xs text-[#90a2bb]">
                        {step.description}
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-12">
          <h2 className="mb-6 text-xl font-bold text-center">
            Why Choose BetWise?
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="border-[#31455f] bg-[#0f172a] p-4 hover:border-[#f5c518] transition"
                >
                  <div className="mb-3 h-10 w-10 rounded bg-[#f5c518] flex items-center justify-center">
                    <Icon className="h-5 w-5 text-[#0b1120]" />
                  </div>
                  <h3 className="mb-1 font-bold text-sm text-white">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-[#90a2bb]">
                    {feature.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center rounded-lg border border-[#31455f] bg-[#0f172a] p-6">
          <h2 className="text-xl font-bold mb-2">Ready to Get Started?</h2>
          <p className="text-sm text-[#90a2bb] mb-4">
            Join thousands of sports enthusiasts. Sign up and start betting today.
          </p>
          <button className="inline-block rounded bg-gradient-to-r from-[#f5c518] to-[#d4a500] px-6 py-2 text-sm font-bold text-[#0b1120] hover:shadow-lg transition">
            Start Betting Now
          </button>
        </div>
      </div>
    </div>
  );
}
