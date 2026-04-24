import { Shield, FileText, CheckCircle, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function TermsPage() {
  const sections = [
    {
      title: "1. Introduction",
      content: "Welcome to BetRixPro. By accessing or using our website, services, or mobile applications, you agree to be bound by these Terms and Conditions. Please read them carefully before using our platform.",
      icon: <FileText className="text-[#f5c518]" size={20} />
    },
    {
      title: "2. Eligibility",
      content: "You must be at least 18 years of age to use BetRixPro. By registering, you warrant that you are of legal age and that you are not prohibited from gambling by any law or jurisdiction.",
      icon: <CheckCircle className="text-green-500" size={20} />
    },
    {
      title: "3. Account Responsibility",
      content: "Users are responsible for maintaining the confidentiality of their account information, including passwords. You agree to notify us immediately of any unauthorized use of your account.",
      icon: <Shield className="text-blue-500" size={20} />
    },
    {
      title: "4. Betting Rules",
      content: "All bets placed on BetRixPro are subject to our betting rules. We reserve the right to void bets in cases of obvious errors, fraud, or technical failures. Decisions made by BetRixPro management are final.",
      icon: <AlertTriangle className="text-[#f5c518]" size={20} />
    },
    {
      title: "5. Deposits and Withdrawals",
      content: "Deposits must be made via authorized payment methods (e.g., M-Pesa). Withdrawals are subject to verification and may take up to 24-48 hours to process. Fees may apply as stated in our FAQ.",
      icon: <FileText className="text-[#f5c518]" size={20} />
    },
    {
      title: "6. Prohibited Activities",
      content: "Users are prohibited from using multiple accounts, engaging in match-fixing, or using automated software (bots) to place bets. Violation of these terms will lead to immediate account suspension and forfeiture of funds.",
      icon: <AlertTriangle className="text-red-500" size={20} />
    }
  ];

  return (
    <div className="min-h-screen bg-[#0b1120] text-white">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-black mb-4 tracking-tight">Terms & Conditions</h1>
          <p className="text-[#90a2bb] max-w-2xl mx-auto leading-relaxed">
            Please read these terms carefully. By using BetRixPro, you acknowledge that you have read, understood, and agreed to be bound by these rules.
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
            Last updated: April 23, 2026. If you have any questions regarding these terms, please contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
}
