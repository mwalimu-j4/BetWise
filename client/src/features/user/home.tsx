import { useState, useEffect } from "react";

// Slide Images
import h1 from "@/assets/h1.jfif";
import h2 from "@/assets/h2.jfif";
import h3 from "@/assets/h3.jfif";
import h4 from "@/assets/h4.jfif";
import h5 from "@/assets/h5.jfif";

const slides = [
  { id: 1, image: h1, title: "Win Big Today", text: "Get the best odds on top premier leagues." },
  { id: 2, image: h2, title: "Try Your Luck", text: "Massive jackpots and daily promotions await." },
  { id: 3, image: h3, title: "Live In-Play Action", text: "Bet on the action as it happens in real-time." },
  { id: 4, image: h4, title: "Lightning Fast Payouts", text: "Enjoy instant M-Pesa deposits and withdrawals." },
  { id: 5, image: h5, title: "Welcome to BetixPro", text: "Kenya's most secure and trusted betting partner." },
];

// NEW: Static Match Data based on your screenshot
const upcomingMatches = [
  {
    id: 1,
    league: "England • FA Cup",
    time: "04/04, 14:45",
    homeTeam: "Man City",
    awayTeam: "Liverpool",
    odds: { home: "1.77", draw: "4.20", away: "4.20" },
    markets: "+93 Markets"
  },
  {
    id: 2,
    league: "England • FA Cup",
    time: "04/04, 19:15",
    homeTeam: "Chelsea",
    awayTeam: "Port Vale",
    odds: { home: "1.08", draw: "13.00", away: "28.00" },
    markets: "+56 Markets"
  },
  {
    id: 3,
    league: "England • FA Cup",
    time: "04/04, 22:00",
    homeTeam: "Southampton",
    awayTeam: "Arsenal",
    odds: { home: "7.40", draw: "5.20", away: "1.40" },
    markets: "+93 Markets"
  },
  {
    id: 4,
    league: "Kenya • Premier League",
    time: "04/04, 15:15",
    homeTeam: "Gor Mahia",
    awayTeam: "Kariobangi Sharks...",
    odds: { home: "1.55", draw: "3.75", away: "6.20" },
    markets: "+24 Markets"
  }
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. The Dynamic Banner */}
      <section className="relative w-full h-[160px] md:h-[220px] overflow-hidden rounded-3xl border border-admin-border bg-admin-card shadow-lg">
        {slides.map((slide, index) => (
          <div 
            key={slide.id} 
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            <img 
              src={slide.image} 
              alt={slide.title} 
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/60 to-transparent flex flex-col justify-end p-4 md:p-6">
              <h2 className="text-xl md:text-3xl font-bold text-white mb-1 drop-shadow-md">
                {slide.title}
              </h2>
              <p className="text-xs md:text-sm text-slate-200 drop-shadow-md line-clamp-1">
                {slide.text}
              </p>
            </div>
          </div>
        ))}
        <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-2">
          {slides.map((_, index) => (
            <span 
              key={index} 
              className={`h-1.5 w-1.5 md:h-2 md:w-2 rounded-full transition-colors duration-300 ${
                index === currentSlide ? "bg-admin-accent w-4 md:w-6" : "bg-white/40"
              }`} 
            />
          ))}
        </div>
      </section>

      {/* 2. NEW: The Live Matches Section */}
      <section className="rounded-3xl border border-admin-border bg-admin-card p-4 md:p-6 shadow-lg">
        
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-[1fr_auto] gap-4 mb-4 px-2 text-xs font-semibold text-admin-text-muted">
          <div>Teams</div>
          <div className="grid grid-cols-3 gap-2 w-[240px] text-center">
            <div>1</div>
            <div>X</div>
            <div>2</div>
          </div>
        </div>

        {/* Matches List */}
        <div className="flex flex-col gap-4">
          {upcomingMatches.map((match) => (
            <div 
              key={match.id} 
              className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-admin-border/50 pb-4 last:border-0 last:pb-0"
            >
              
              {/* Left Side: Match Info */}
              <div className="flex-1">
                <div className="flex items-center justify-between md:justify-start gap-2 mb-1.5 text-xs text-admin-text-muted">
                  <div className="flex items-center gap-1.5">
                    <span>⚽</span>
                    <span>{match.league}</span>
                  </div>
                  <span className="md:hidden">{match.time}</span>
                </div>
                <div className="text-sm font-bold text-admin-text-primary leading-tight">
                  <p>{match.homeTeam}</p>
                  <p>{match.awayTeam}</p>
                </div>
              </div>

              {/* Right Side: Odds Buttons & Meta */}
              <div className="flex flex-col items-end gap-1.5">
                <div className="hidden md:block text-xs text-admin-text-muted mb-1">
                  {match.time}
                </div>
                
                {/* Odds Buttons */}
                <div className="grid grid-cols-3 gap-2 w-full md:w-[240px]">
                  <button className="h-10 rounded-full bg-[var(--color-bg-elevated)] border border-admin-border/50 text-admin-text-primary text-sm font-semibold transition hover:bg-admin-border hover:text-white">
                    {match.odds.home}
                  </button>
                  <button className="h-10 rounded-full bg-[var(--color-bg-elevated)] border border-admin-border/50 text-admin-text-primary text-sm font-semibold transition hover:bg-admin-border hover:text-white">
                    {match.odds.draw}
                  </button>
                  <button className="h-10 rounded-full bg-[var(--color-bg-elevated)] border border-admin-border/50 text-admin-text-primary text-sm font-semibold transition hover:bg-admin-border hover:text-white">
                    {match.odds.away}
                  </button>
                </div>
                
                {/* Markets Link */}
                {/* Markets Link */}

                  <div className="text-[11px] font-medium text-green-400 hover:text-green-300 cursor-pointer mt-0.5 transition-colors">
                    {match.markets}
                       </div>
              </div>

            </div>
          ))}
        </div>

      </section>
    </div>
  );
}