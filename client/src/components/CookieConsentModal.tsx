import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Info, Shield, X } from "lucide-react";
import { useEffect, useState } from "react";

interface CookieConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CookieConsentModal({ isOpen, onClose }: CookieConsentModalProps) {
  const [showPreferences, setShowPreferences] = useState(false);
  const [prefs, setPrefs] = useState({
    essential: true, // Always true
    functional: true,
    analytics: true,
    marketing: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem("bc_cookie_consent");
    if (saved) {
      try {
        setPrefs(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse cookie preferences", e);
      }
    }
  }, []);

  const handleSave = (newPrefs: typeof prefs) => {
    localStorage.setItem("bc_cookie_consent", JSON.stringify(newPrefs));
    onClose();
  };

  const handleAcceptAll = () => {
    const allOn = { essential: true, functional: true, analytics: true, marketing: true };
    setPrefs(allOn);
    handleSave(allOn);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[#1e3350] bg-[#0b1120] shadow-2xl">
        {/* Header */}
        <div className="relative border-b border-[#1e3350] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5c518]/10 text-[#f5c518]">
              <Shield size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Cookie Settings</h2>
              <p className="text-xs text-[#637fa0]">Manage your privacy preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute right-6 top-6 text-[#637fa0] hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!showPreferences ? (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-[#90a2bb]">
                We use cookies to enhance your experience, analyze site traffic, and serve personalized content. By clicking "Accept All", you consent to our use of cookies.
              </p>
              <div className="flex flex-col gap-3 pt-2">
                <Button 
                  onClick={handleAcceptAll}
                  className="w-full bg-[#f5c518] font-bold text-black hover:bg-[#d4a500] h-11 rounded-xl"
                >
                  Accept All
                </Button>
                <div className="flex gap-3">
                  <Button 
                    variant="outline"
                    onClick={() => setShowPreferences(true)}
                    className="flex-1 border-[#1e3350] bg-[#111d2e] font-semibold text-white hover:bg-[#1a2b44] h-11 rounded-xl"
                  >
                    Preferences
                  </Button>
                  <Button 
                    variant="ghost"
                    onClick={() => handleSave({ ...prefs, functional: false, analytics: false, marketing: false })}
                    className="flex-1 text-[#637fa0] hover:text-white h-11 font-semibold"
                  >
                    Essential Only
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {/* Essential */}
                <div className="flex items-center justify-between rounded-2xl border border-[#1e3350]/50 bg-[#111d2e]/50 p-4">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-white">Essential</span>
                      <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-[#637fa0] uppercase">Required</span>
                    </div>
                    <p className="text-xs text-[#637fa0]">Necessary for the website to function properly.</p>
                  </div>
                  <Switch checked={true} disabled className="data-[state=checked]:bg-[#f5c518]" />
                </div>

                {/* Functional */}
                <div className="flex items-center justify-between rounded-2xl border border-[#1e3350]/50 bg-[#111d2e]/50 p-4">
                  <div className="flex-1 pr-4">
                    <h4 className="text-sm font-bold text-white mb-1">Functional</h4>
                    <p className="text-xs text-[#637fa0]">Remember your preferences and settings.</p>
                  </div>
                  <Switch 
                    checked={prefs.functional} 
                    onCheckedChange={(val) => setPrefs(p => ({ ...p, functional: val }))}
                    className="data-[state=checked]:bg-[#f5c518]"
                  />
                </div>

                {/* Analytics */}
                <div className="flex items-center justify-between rounded-2xl border border-[#1e3350]/50 bg-[#111d2e]/50 p-4">
                  <div className="flex-1 pr-4">
                    <h4 className="text-sm font-bold text-white mb-1">Analytics</h4>
                    <p className="text-xs text-[#637fa0]">Help us understand how visitors interact with the site.</p>
                  </div>
                  <Switch 
                    checked={prefs.analytics} 
                    onCheckedChange={(val) => setPrefs(p => ({ ...p, analytics: val }))}
                    className="data-[state=checked]:bg-[#f5c518]"
                  />
                </div>

                {/* Marketing */}
                <div className="flex items-center justify-between rounded-2xl border border-[#1e3350]/50 bg-[#111d2e]/50 p-4">
                  <div className="flex-1 pr-4">
                    <h4 className="text-sm font-bold text-white mb-1">Marketing</h4>
                    <p className="text-xs text-[#637fa0]">Used to deliver more relevant advertisements.</p>
                  </div>
                  <Switch 
                    checked={prefs.marketing} 
                    onCheckedChange={(val) => setPrefs(p => ({ ...p, marketing: val }))}
                    className="data-[state=checked]:bg-[#f5c518]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline"
                  onClick={() => setShowPreferences(false)}
                  className="flex-1 border-[#1e3350] bg-[#111d2e] font-semibold text-white h-11 rounded-xl"
                >
                  Back
                </Button>
                <Button 
                  onClick={() => handleSave(prefs)}
                  className="flex-1 bg-[#f5c518] font-bold text-black hover:bg-[#d4a500] h-11 rounded-xl"
                >
                  Save Choices
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-[#111d2e] px-6 py-4 flex items-center gap-2">
          <Info size={14} className="text-[#637fa0]" />
          <p className="text-[10px] text-[#637fa0]">
            Your preferences are stored locally and can be changed anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
