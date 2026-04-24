import { Shield, Eye, Lock, Database, UserCheck, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function PrivacyPage() {
  const sections = [
    {
      title: "1. Data Collection",
      content: "We collect information you provide during registration, such as your phone number and email. We also collect transaction data and betting history to provide and improve our services.",
      icon: <Database className="text-blue-400" size={20} />
    },
    {
      title: "2. How We Use Your Information",
      content: "Your data is used to process bets, manage your wallet, verify your identity, and prevent fraud. We may also use your email to send important updates or promotional offers.",
      icon: <Eye className="text-[#f5c518]" size={20} />
    },
    {
      title: "3. Data Security",
      content: "We implement industry-standard security measures, including SSL encryption and secure servers, to protect your personal information from unauthorized access or disclosure.",
      icon: <Lock className="text-green-500" size={20} />
    },
    {
      title: "4. Third-Party Sharing",
      content: "We do not sell your personal data. We only share information with trusted partners (like payment providers) necessary to complete transactions or when required by law.",
      icon: <UserCheck className="text-purple-400" size={20} />
    },
    {
      title: "5. Cookies & Tracking",
      content: "We use cookies to enhance your experience, remember your preferences, and analyze site traffic. You can manage your cookie preferences through our dedicated Cookie Consent Modal.",
      icon: <Shield className="text-[#f5c518]" size={20} />
    },
    {
      title: "6. Your Rights",
      content: "You have the right to access, correct, or request the deletion of your personal data. If you wish to exercise these rights, please contact our support team via the contact form.",
      icon: <MessageSquare className="text-orange-400" size={20} />
    }
  ];

  return (
    <div className="min-h-screen bg-[#0b1120] text-white">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-black mb-4 tracking-tight">Privacy Policy</h1>
          <p className="text-[#90a2bb] max-w-2xl mx-auto leading-relaxed">
            Your privacy is important to us. This policy explains how we collect, use, and protect your personal information at BetRixPro.
          </p>
        </div>

        <div className="space-y-6">
          {sections.map((section, idx) => (
            <Card key={idx} className="overflow-hidden border border-[#1e3350] bg-[#0f172a] p-6 rounded-2xl shadow-lg transition-all hover:border-[#f5c518]/30">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1e3350]/50">
                  {section.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">{section.title}</h3>
                  <p className="text-[#90a2bb] leading-relaxed text-sm sm:text-base">
                    {section.content}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-12 p-8 rounded-2xl border border-[#1e3350] bg-linear-to-br from-[#0f172a] to-[#111d2e] text-center">
          <p className="text-[#637fa0] text-sm leading-relaxed">
            Last updated: April 23, 2026. BetRixPro is committed to protecting your personal data in accordance with applicable laws.
          </p>
        </div>
      </div>
    </div>
  );
}
