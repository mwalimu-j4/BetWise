import { useState, useEffect } from "react";
import { Trophy, Clock, Activity } from "lucide-react";

// Importing the .jfif images directly from your assets folder
import h1 from "@/assets/h1.jfif";
import h2 from "@/assets/h2.jfif";
import h3 from "@/assets/h3.jfif";
import h4 from "@/assets/h4.jfif";
import h5 from "@/assets/h5.jfif";

const bannerImages = [h1, h2, h3, h4, h5];

// Static data for the matches based on your inspiration image
const staticMatches = [
  {
    id: 1,
    league: "England • FA Cup",
    time: "Today, 14:45",
    teamA: "Man City",
    teamB: "Liverpool",
    odds: { home: "1.77", draw: "4.20", away: "4.20" },
    markets: "+93 Markets"
  },
  {
    id: 2,
    league: "England • FA Cup",
    time: "Today, 19:15",
    teamA: "Chelsea",
    teamB: "Aston Villa",
    odds: { home: "1.95", draw: "3.60", away: "3.80" },
    markets: "+85 Markets"
  },
  {
    id: 3,
    league: "Spain • La Liga",
    time: "Tomorrow, 22:00",
    teamA: "Real Madrid",
    teamB: "Sevilla",
    odds: { home: "1.45", draw: "4.50", away: "6.50" },
    markets: "+112 Markets"
  }
];

export default function Home() {
  const [currentImg, setCurrentImg] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15600); // Countdown starts at ~4.3 hours

  // Auto-slide images every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImg((prev) => (prev + 1) % bannerImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Countdown timer logic
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format seconds into HH : MM : SS
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      
      {/* 1. DYNAMIC HERO BANNER WITH ENGAGING NUMBERS */}
      <section className="relative h-64 w-full overflow-hidden rounded-2xl bg-[#0b1426] shadow-lg md:h-80">
        {/* Images */}
        {bannerImages.map((img, index) => (
          <img
            key={index}
            src={img}
            alt={`Banner ${index + 1}`}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
              index === currentImg ? "opacity-60" : "opacity-0"
            }`}
          />
        ))}
        
        {/* Dark gradient overlay so text is readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1426] via-[#0b1426]/50 to-transparent opacity-90"></div>
        
        {/* Banner Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            
            {/* Title & Subtitle */}
            <div>
              <h2 className="mb-2 text-3xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow-lg">
                Live In-Play Action
              </h2>
              <p className="text-sm md:text-base font-medium text-gray-300 drop-shadow-md max-w-md">
                Bet on the action as it happens in real-time. Unbeatable odds on top leagues.
              </p>
            </div>

            {/* Engaging Numbers & Timer */}
            <div className="flex gap-4">
              <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-lg p-3 text-center min-w-[100px]">
                <Activity className="mx-auto mb-1 text-[#22c55e]" size={18} />
                <p className="text-xs text-gray-400">Live Games</p>
                <p className="text-lg font-bold text-white">42</p>
              </div>
              <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-lg p-3 text-center min-w-[100px]">
                <Clock className="mx-auto mb-1 text-[#FFC107]" size={18} />
                <p className="text-xs text-gray-400">Next Jackpot</p>
                <p className="text-lg font-bold text-[#FFC107]">{formatTime(timeLeft)}</p>
              </div>
            </div>

          </div>
        </div>

        {/* Carousel Navigation Dots */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {bannerImages.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentImg ? "w-6 bg-[#FFC107]" : "w-2 bg-white/50"
              }`}
            />
          ))}
        </div>
      </section>

      {/* 2. STATIC MATCHES LIST (Replaces the BetCenic Cards) */}
      <section className="flex flex-col bg-[var(--color-bg-elevated,#121e2d)] rounded-xl border border-admin-border overflow-hidden">
        {/* Headers */}
        <div className="flex justify-between text-xs text-admin-text-muted font-medium px-4 py-3 bg-[var(--color-bg-base,#0b1426)] border-b border-admin-border hidden md:flex">
          <span>Teams</span>
          <div className="flex w-[240px] justify-between pr-10">
            <span>1</span>
            <span>X</span>
            <span>2</span>
          </div>
        </div>

        {/* Match Rows */}
        <div className="flex flex-col p-2 gap-2">
          {staticMatches.map((match) => (
            <div 
              key={match.id} 
              className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-admin-border"
            >
              {/* Left: League & Teams */}
              <div className="flex gap-3 mb-4 md:mb-0">
                <Trophy className="text-admin-text-muted mt-1" size={16} />
                <div>
                  <p className="text-[11px] text-admin-text-muted mb-1 flex items-center gap-1">
                    ⚽ {match.league}
                  </p>
                  <div className="flex flex-col text-sm font-bold text-white leading-relaxed">
                    <span>{match.teamA}</span>
                    <span>{match.teamB}</span>
                  </div>
                </div>
              </div>

              {/* Right: Odds & Markets */}
              <div className="flex flex-col items-end gap-1 w-full md:w-auto">
                <p className="text-[10px] text-admin-text-muted mr-2">{match.time}</p>
                <div className="flex items-center justify-between md:justify-end w-full gap-3">
                  <div className="flex gap-2 w-full md:w-auto justify-between">
                    <button className="w-16 py-2.5 rounded bg-[#1e293b] text-white text-xs font-bold hover:bg-[#334155] transition-colors border border-transparent hover:border-admin-accent">
                      {match.odds.home}
                    </button>
                    <button className="w-16 py-2.5 rounded bg-[#1e293b] text-white text-xs font-bold hover:bg-[#334155] transition-colors border border-transparent hover:border-admin-accent">
                      {match.odds.draw}
                    </button>
                    <button className="w-16 py-2.5 rounded bg-[#1e293b] text-white text-xs font-bold hover:bg-[#334155] transition-colors border border-transparent hover:border-admin-accent">
                      {match.odds.away}
                    </button>
                  </div>
                  <span className="text-[11px] text-[#22c55e] font-medium min-w-[60px] text-right cursor-pointer hover:underline hidden md:block">
                    {match.markets}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}