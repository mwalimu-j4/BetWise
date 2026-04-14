import logo from "@/assets/logo.png";

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-linear-to-br from-[#0d2137] via-[#1a3a6b] to-[#0d2137] z-50">
      <div className="text-center space-y-6">
        <div className="animate-pulse">
          <img 
            src={logo} 
            alt="BetixPro Logo" 
            className="h-16 w-auto mx-auto object-contain md:h-24" 
          />
        </div>
        <div className="flex items-center justify-center gap-1.5">
          <div
            className="h-2 w-2 bg-[#ffd500] rounded-full animate-bounce"
            style={{ animationDelay: "0s" }}
          />
          <div
            className="h-2 w-2 bg-[#ffd500] rounded-full animate-bounce"
            style={{ animationDelay: "0.15s" }}
          />
          <div
            className="h-2 w-2 bg-[#ffd500] rounded-full animate-bounce"
            style={{ animationDelay: "0.3s" }}
          />
        </div>
      </div>
    </div>
  );
}