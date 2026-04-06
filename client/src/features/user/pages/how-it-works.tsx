import { useState } from "react";
import { ChevronDown, Zap, Users, TrendingUp, Lock, Smartphone } from "lucide-react";
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
      title: "Create Your Account",
      description:
        "Sign up with your email and create a secure password. Complete your profile with your personal information to get started.",
    },
    {
      number: 2,
      icon: Users,
      title: "Fund Your Wallet",
      description:
        "Add funds to your wallet using M-Pesa or other available payment methods. Your funds are secured and ready to use instantly.",
    },
    {
      number: 3,
      icon: TrendingUp,
      title: "Browse & Select Events",
      description:
        "Explore upcoming sports events across multiple leagues and sports. Compare odds and select the events you want to bet on.",
    },
    {
      number: 4,
      icon: Zap,
      title: "Place Your Bet",
      description:
        "Add your selections to the bet slip, set your stake amount, and place your bet. Review all details before confirming.",
    },
    {
      number: 5,
      icon: Lock,
      title: "Monitor & Win",
      description:
        "Track your active bets in real-time. Once events conclude, winnings are automatically credited to your wallet.",
    },
  ];

  const features: Feature[] = [
    {
      icon: Zap,
      title: "Fast & Intuitive",
      description:
        "Our platform is designed for speed and ease of use, allowing you to place bets in seconds with an intuitive interface.",
    },
    {
      icon: Lock,
      title: "Secure & Safe",
      description:
        "Your data and funds are protected with industry-leading security protocols. We use SSL encryption and secure payment gateways.",
    },
    {
      icon: TrendingUp,
      title: "Best Odds",
      description:
        "Enjoy competitive odds across all sports and events. Our sophisticated algorithms ensure you always get the best value.",
    },
    {
      icon: Users,
      title: "Live Betting",
      description:
        "Place bets on live events as they happen. React to real-time developments and capitalize on changing odds instantly.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1120] to-[#0f172a] text-white">
      {/* Hero Section */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-16 space-y-4 text-center">
          <h1 className="text-4xl font-bold sm:text-5xl">How BetWise Works</h1>
          <p className="mx-auto max-w-2xl text-lg text-[#90a2bb]">
            Get started with sports betting in just a few simple steps. Follow
            our guide to learn how to make the most of your BetWise experience.
          </p>
        </div>

        {/* Steps Section */}
        <div className="mb-20">
          <h2 className="mb-10 text-center text-2xl font-bold">
            5 Easy Steps to Get Started
          </h2>
          <div className="space-y-4">
            {steps.map((step) => {
              const Icon = step.icon;
              const isExpanded = expandedStep === step.number;

              return (
                <Card
                  key={step.number}
                  className="overflow-hidden border-[#31455f] bg-[#0f172a] transition-all duration-200"
                >
                  <button
                    onClick={() =>
                      setExpandedStep(isExpanded ? null : step.number)
                    }
                    className="w-full px-6 py-5 text-left hover:bg-[#1a2a3a] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#f5c518] to-[#d4a500]">
                          <Icon className="h-6 w-6 text-[#0b1120]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#f5c518]">
                            Step {step.number}
                          </p>
                          <p className="text-lg font-bold text-white">
                            {step.title}
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`h-5 w-5 transition-transform duration-200 text-[#f5c518] ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-[#31455f] bg-[#0c1018] px-6 py-5">
                      <p className="text-[#90a2bb]">{step.description}</p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-20">
          <h2 className="mb-10 text-center text-2xl font-bold">
            Why Choose BetWise?
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="border-[#31455f] bg-[#0f172a] p-6 hover:border-[#f5c518] transition-all duration-200"
                >
                  <div className="mb-4 h-12 w-12 rounded-lg bg-gradient-to-br from-[#f5c518] to-[#d4a500] flex items-center justify-center">
                    <Icon className="h-6 w-6 text-[#0b1120]" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-white">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[#90a2bb]">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Tips Section */}
        <div className="mb-20 rounded-xl border border-[#31455f] bg-gradient-to-r from-[#0f172a] to-[#1a2a3a] p-8">
          <h2 className="mb-6 text-2xl font-bold">Pro Tips for Better Betting</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 font-bold text-[#f5c518]">
                Research Before Betting
              </h3>
              <p className="text-sm text-[#90a2bb]">
                Take time to analyze teams, recent form, head-to-head records,
                and other relevant statistics before placing your bet.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-bold text-[#f5c518]">Manage Your Bankroll</h3>
              <p className="text-sm text-[#90a2bb]">
                Set a budget and stick to it. Only bet what you can afford to
                lose and avoid chasing losses.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-bold text-[#f5c518]">
                Understand the Odds
              </h3>
              <p className="text-sm text-[#90a2bb]">
                Learn how odds work and what they mean. Higher odds mean lower
                probability but higher potential winnings.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-bold text-[#f5c518]">Use Live Betting</h3>
              <p className="text-sm text-[#90a2bb]">
                Take advantage of live betting to place bets as events unfold.
                This allows you to react to real-time developments.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-bold">Ready to Get Started?</h2>
          <p className="mx-auto max-w-xl text-[#90a2bb]">
            Join thousands of sports enthusiasts already enjoying BetWise. Sign
            up today and receive a welcome bonus on your first deposit.
          </p>
          <button className="mt-6 inline-block rounded-lg bg-gradient-to-r from-[#f5c518] to-[#d4a500] px-8 py-3 font-bold text-[#0b1120] hover:shadow-lg transition-all duration-200">
            Start Betting Now
          </button>
        </div>
      </div>
    </div>
  );
}
