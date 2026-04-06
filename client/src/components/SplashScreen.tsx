export default function SplashScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-[#0d2137] via-[#1a3a6b] to-[#0d2137] z-50">
      <div className="text-center space-y-4">
        <div className="animate-pulse">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter">
            <span className="bg-gradient-to-r from-[#f5c518] to-[#e6b800] bg-clip-text text-transparent">
              BetixPro
            </span>
          </h1>
        </div>
        <div className="flex items-center justify-center gap-1.5">
          <div className="h-2 w-2 bg-[#f5c518] rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
          <div className="h-2 w-2 bg-[#f5c518] rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
          <div className="h-2 w-2 bg-[#f5c518] rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
        </div>
      </div>
    </div>
  );
}
