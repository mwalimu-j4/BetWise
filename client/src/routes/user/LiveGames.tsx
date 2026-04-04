import React, { useState } from "react";
import { 
  ChevronUp, 
  Globe, 
  PlayCircle, 
  BarChart2, 
  Trash2, 
  Ticket 
} from "lucide-react";

// --- MOCK DATA ---
// We will use this until your team hooks up the real API
const LIVE_MATCHES = [
  {
    id: "league_1",
    league: "Italy • Serie C, Group B",
    count: 1,
    matches: [
      {
        id: "m1",
        time: "2nd half 82:08",
        teamA: { name: "Ascoli Calcio 1898", score: 0 },
        teamB: { name: "Vis Pesaro 1898", score: 1 },
        hasTracker: true,
        hasStream: true,
        odds: { home: "9.25", draw: "2.90", away: "1.52" },
        moreMarkets: "+14",
      },
    ],
  },
  {
    id: "league_2",
    league: "Brazil • Brasileiro Serie D",
    count: 11,
    matches: [
      {
        id: "m2",
        time: "2nd half 81:21",
        teamA: { name: "Iape", score: 2 },
        teamB: { name: "Maracana Ec Ce", score: 2 },
        hasTracker: true,
        hasStream: true,
        odds: { home: "4.90", draw: "1.27", away: "8.00" },
        moreMarkets: "+9",
      },
      {
        id: "m3",
        time: "2nd half 78:29",
        teamA: { name: "Sd Juazeirense Ba", score: 3 },
        teamB: { name: "Cs Esportiva Al", score: 1 },
        hasTracker: true,
        hasStream: true,
        odds: { home: "—", draw: "8.75", away: "180.00" },
        moreMarkets: "+9",
      },
    ],
  },
];

export default function LiveGames() {
  const [betSlipCode, setBetSlipCode] = useState("");

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4 min-h-screen bg-[#0b1426] text-white">
      
      {/* ========================================== */}
      {/* LEFT COLUMN: LIVE MATCHES LIST             */}
      {/* ========================================== */}
      <div className="flex-1 flex flex-col gap-4">
        
        {/* Header Section */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold">Live Games</h1>
          <div className="flex gap-2">
            <button className="px-4 py-1.5 text-sm font-medium bg-[#1e293b] border border-gray-700 rounded hover:bg-gray-700 transition">
              Highlights
            </button>
            <button className="px-4 py-1.5 text-sm font-medium bg-[#1e293b] border border-gray-700 rounded hover:bg-gray-700 transition flex items-center gap-2">
              Sort By <ChevronUp size={14} className="rotate-180" />
            </button>
          </div>
        </div>

        {/* League Groups */}
        {LIVE_MATCHES.map((leagueGroup) => (
          <div key={leagueGroup.id} className="bg-[#121e2d] rounded-lg border border-gray-800 overflow-hidden">
            
            {/* League Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#162436] border-b border-gray-800 cursor-pointer hover:bg-[#1a2a3f] transition">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-gray-400" />
                <span className="text-sm font-bold text-gray-200">{leagueGroup.league}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-[#1e293b] text-xs font-bold px-2 py-0.5 rounded-full text-gray-300">
                  {leagueGroup.count}
                </span>
                <ChevronUp size={18} className="text-gray-400" />
              </div>
            </div>

            {/* Matches in League */}
            <div className="flex flex-col">
              {leagueGroup.matches.map((match, index) => (
                <div 
                  key={match.id} 
                  className={`p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:bg-[#1a2a3f] transition ${
                    index !== leagueGroup.matches.length - 1 ? "border-b border-gray-800" : ""
                  }`}
                >
                  
                  {/* Match Info (Left) */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                        Live
                      </span>
                      <span className="text-xs text-red-500 font-medium">{match.time}</span>
                    </div>
                    
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                      {/* Scores */}
                      <div className="flex flex-col gap-1 text-sm font-bold text-[#22c55e]">
                        <span>{match.teamA.score}</span>
                        <span>{match.teamB.score}</span>
                      </div>
                      {/* Teams */}
                      <div className="flex flex-col gap-1 text-sm font-bold text-gray-200">
                        <div className="flex items-center gap-2">
                          <span>{match.teamA.name}</span>
                          {index === 0 && <span className="bg-gray-700 text-[9px] px-1 rounded text-gray-300 border border-gray-600">CO</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{match.teamB.name}</span>
                          {index === 1 && <span className="bg-gray-700 text-[9px] px-1 rounded text-gray-300 border border-gray-600">CO</span>}
                        </div>
                      </div>
                      {/* Media Icons */}
                      <div className="flex flex-col gap-1 text-gray-500">
                        {match.hasTracker && <BarChart2 size={14} className="hover:text-white cursor-pointer" />}
                        {match.hasStream && <PlayCircle size={14} className="hover:text-white cursor-pointer" />}
                      </div>
                    </div>
                  </div>

                  {/* Odds (Right) */}
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-1 w-full justify-center pr-12">
                      <span className="flex-1 text-center">1</span>
                      <span className="flex-1 text-center">• X •</span>
                      <span className="flex-1 text-center">2</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="w-16 py-2.5 rounded bg-[#1e293b] text-white text-xs font-bold hover:bg-[#334155] transition-colors">
                        {match.odds.home}
                      </button>
                      <button className="w-16 py-2.5 rounded bg-[#1e293b] text-white text-xs font-bold hover:bg-[#334155] transition-colors">
                        {match.odds.draw}
                      </button>
                      <button className="w-16 py-2.5 rounded bg-[#1e293b] text-white text-xs font-bold hover:bg-[#334155] transition-colors">
                        {match.odds.away}
                      </button>
                      <span className="text-xs text-[#22c55e] font-medium min-w-[30px] text-right cursor-pointer hover:underline">
                        {match.moreMarkets}
                      </span>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ========================================== */}
      {/* RIGHT COLUMN: BETSLIP SIDEBAR              */}
      {/* ========================================== */}
      <aside className="w-full lg:w-[320px] shrink-0">
        <div className="bg-[#121e2d] rounded-lg border border-gray-800 flex flex-col h-full min-h-[500px]">
          
          {/* Betslip Header */}
          <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-[#162436] rounded-t-lg">
            <button className="w-full bg-[#1e293b] py-2 rounded text-sm font-bold text-white">
              Betslip
            </button>
          </div>
          <div className="flex justify-end p-2">
            <button className="text-xs text-gray-400 hover:text-white transition flex items-center gap-1">
              Clear All <Trash2 size={12} />
            </button>
          </div>

          {/* Empty State */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            {/* Placeholder for the graphic in the screenshot */}
            <div className="w-32 h-32 mb-4 relative flex items-center justify-center">
               <div className="absolute inset-0 bg-gradient-to-tr from-green-500/20 to-blue-500/20 rounded-full blur-xl"></div>
               <Ticket size={64} className="text-gray-600 relative z-10 transform -rotate-12" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Empty Betting slip</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Add games to place a bet or enter a code below to load a betslip
            </p>
          </div>

          {/* Load Slip Input */}
          <div className="p-4 border-t border-gray-800 mt-auto">
            <div className="bg-[#1e293b] rounded border border-gray-700 p-1 mb-2">
              <input 
                type="text" 
                placeholder="e.g. DMuER" 
                value={betSlipCode}
                onChange={(e) => setBetSlipCode(e.target.value)}
                className="w-full bg-transparent text-sm text-center text-white outline-none p-2 placeholder:text-gray-600"
              />
            </div>
            <p className="text-[10px] text-center text-gray-500 mb-4">
              A booking code helps you quickly load a betslip
            </p>
            <button className="w-full bg-[#65a30d] hover:bg-[#4d7c0f] text-white font-bold py-3 rounded transition-colors shadow-lg shadow-green-900/20">
              Load Slip
            </button>
          </div>

        </div>
      </aside>

    </div>
  );
}