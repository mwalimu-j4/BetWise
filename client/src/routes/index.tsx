import { createFileRoute } from "@tanstack/react-router";

// 1. This connects the file to the router (your magic map!)
export const Route = createFileRoute("/")({
  component: HomePage,
});

// 2. This is your actual UI component
function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      
      {/* Main Heading */}
      <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4">
        Smart Betting Starts Here
      </h1>
      
      {/* Subheading */}
      <p className="text-lg text-slate-600 mb-8 max-w-lg mx-auto">
        Experience fast M-Pesa deposits, secure wallets, and the best odds on BetCenic.
      </p>
      
      {/* A basic Tailwind button (we can swap this for a Shadcn button later!) */}
      <button className="bg-emerald-600 text-white px-8 py-3 rounded-md font-semibold hover:bg-emerald-700 transition-colors">
        View Live Matches
      </button>

    </div>
  );
}