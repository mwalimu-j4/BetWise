import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";

interface FAQ {
  id: number;
  category: string;
  question: string;
  answer: string;
}

export default function FAQs() {
  const faqs: FAQ[] = [
    {
      id: 1,
      category: "Account & Registration",
      question: "How do I create a BetRixPro account?",
      answer:
        "Simply click the 'Sign Up' button, enter your email address, create a strong password, and fill in your personal details. Once your account is verified, you can immediately start exploring events and placing bets.",
    },
    {
      id: 2,
      category: "Account & Registration",
      question: "Is my personal information secure?",
      answer:
        "Yes, we take security very seriously. All personal information is encrypted and stored securely using industry-standard SSL encryption. We never share your data with third parties without your consent.",
    },
    {
      id: 3,
      category: "Account & Registration",
      question: "Can I change my username or email?",
      answer:
        "You can update your email address from your account settings. For security reasons, usernames cannot be changed once created. If you need further assistance, please contact our support team.",
    },
    {
      id: 4,
      category: "Payments & Wallet",
      question: "What payment methods do you accept?",
      answer:
        "We currently accept M-Pesa and other digital payment methods. M-Pesa is our primary integrated payment method for deposits and withdrawals. Check the payment section for the latest options available.",
    },
    {
      id: 5,
      category: "Payments & Wallet",
      question: "How long does it take to deposit funds?",
      answer:
        "M-Pesa deposits are processed instantly. Once you complete the payment on your phone, the funds are immediately available in your wallet and ready to use for betting.",
    },
    {
      id: 6,
      category: "Payments & Wallet",
      question: "How long does a withdrawal take?",
      answer:
        "Withdrawal requests are processed as follows: Requests are reviewed within 24 hours. Once approved, funds are transferred to your M-Pesa account. Actual transfer time depends on your bank and may take between 1-3 business days.",
    },
    {
      id: 7,
      category: "Payments & Wallet",
      question: "Is there a minimum withdrawal amount?",
      answer:
        "Yes, the minimum withdrawal amount is 100 KES, and the maximum is 10,000 KES per request. A 5% withdrawal fee is applied to all withdrawal requests.",
    },
    {
      id: 8,
      category: "Betting",
      question: "How do I place a bet?",
      answer:
        "Browse available events, select your desired outcomes, add them to your bet slip, enter your stake amount, and confirm your bet. Your bet will be active immediately and you can track it in your 'My Bets' section.",
    },
    {
      id: 9,
      category: "Betting",
      question: "What is a bet slip?",
      answer:
        "The bet slip is a tool where you add your selections before placing a bet. It shows you the odds, potential winnings, total stake, and lets you adjust your bet before confirming. You can add multiple selections for combo bets.",
    },
    {
      id: 10,
      category: "Betting",
      question: "Can I place bets on live events?",
      answer:
        "Yes! We offer live betting on all ongoing events. Odds update in real-time as the event progresses. You can place bets on live events anytime before the match concludes.",
    },
    {
      id: 11,
      category: "Betting",
      question: "What happens if an event is cancelled?",
      answer:
        "If an event is cancelled before it starts, your bet will be voided and your stake will be refunded to your wallet. This ensures fair treatment for all our bettors.",
    },
    {
      id: 12,
      category: "Betting",
      question: "How are winnings calculated?",
      answer:
        "Winnings = Stake × Odds. For example, if you bet 1000 KES at 2.5 odds, your winnings would be 2500 KES, and your net profit would be 1500 KES. For combo bets, the odds are multiplied together.",
    },
    {
      id: 13,
      category: "Account Management",
      question: "How do I view my betting history?",
      answer:
        "You can view all your past bets in the 'My Bets' section. Filter by status (settled, pending, cancelled) or date range to find specific bets. Detailed information for each bet is available.",
    },
    {
      id: 14,
      category: "Account Management",
      question: "How do I contact customer support?",
      answer:
        "You can reach our support team through the support section in the app. We're available 24/7 to help with any questions or issues. Response times are typically within 24 hours.",
    },
    {
      id: 15,
      category: "Account Management",
      question: "Can I close my account?",
      answer:
        "Yes, you can request to close your account anytime from your account settings. Withdraw any remaining balance first, as a closed account cannot be used for betting. Please note that some account closures require a review period.",
    },
    {
      id: 16,
      category: "Responsible Betting",
      question: "What is responsible gambling?",
      answer:
        "Responsible gambling means betting within your means and treating it as entertainment, not as a source of income. Set limits on time and money, take breaks, and seek help if you feel you have a problem.",
    },
    {
      id: 17,
      category: "Responsible Betting",
      question: "How can I set betting limits?",
      answer:
        "Visit your account settings to set daily, weekly, or monthly deposit limits. You can also set time limits on your account. These limits help you control your spending and encourage responsible betting.",
    },
  ];

  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const categories = Array.from(new Set(faqs.map((faq) => faq.category)));

  const toggleExpand = (id: number) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1120] to-[#0f172a] text-white">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="mb-16 text-center">
          <h1 className="text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-base text-[#90a2bb] max-w-2xl mx-auto leading-relaxed">
            Find answers to common questions about BetRixPro, betting, payments,
            and account management.
          </p>
        </div>

        {/* FAQs by Category */}
        <div className="space-y-12">
          {categories.map((category) => (
            <div key={category}>
              <h2 className="text-2xl font-bold text-[#f5c518] mb-6">
                {category}
              </h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {faqs
                  .filter((faq) => faq.category === category)
                  .map((faq) => (
                    <Card
                      key={faq.id}
                      className="overflow-hidden border border-[#31455f] bg-[#0f172a] rounded-2xl"
                    >
                      <button
                        onClick={() => toggleExpand(faq.id)}
                        className="w-full px-6 py-5 text-left"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <h3 className="text-base font-semibold text-white leading-snug">
                            {faq.question}
                          </h3>
                          <ChevronDown
                            className={`h-6 w-6 flex-shrink-0 text-[#f5c518] transition-all duration-300 hover:scale-110 cursor-pointer ${
                              expandedFAQ === faq.id ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </button>

                      {expandedFAQ === faq.id && (
                        <div className="border-t border-[#31455f] bg-[#0c1018] px-6 py-5 animate-in fade-in duration-200">
                          <p className="text-base text-[#90a2bb] leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                      )}
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Still Need Help Section */}
        <div className="mt-16 rounded-2xl border border-[#31455f] bg-[#0f172a] p-10 text-center">
          <h2 className="text-2xl font-bold mb-3">Still have questions?</h2>
          <p className="text-base text-[#90a2bb] mb-6 leading-relaxed">
            Can't find the answer you're looking for? Please reach out to our
            customer support team. We're here to help!
          </p>
          <button className="inline-block rounded-xl bg-gradient-to-r from-[#f5c518] to-[#d4a500] px-10 py-3 font-bold text-[#0b1120] hover:shadow-xl hover:scale-105 transition-all duration-200">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
