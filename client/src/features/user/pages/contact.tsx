import { useAuth } from "@/context/AuthContext";
import { useCallback, useState } from "react";
import { MessageSquare, AlertCircle, Loader2 } from "lucide-react";
import ContactForm from "./contact-form";
import { api } from "@/api/axiosConfig";
import { toast } from "sonner";

interface Contact {
  id: string;
  subject: string;
  message: string;
  status: "SUBMITTED" | "READ" | "RESOLVED";
  createdAt: string;
  updatedAt: string;
}

export default function Contact() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Contact[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showMessages, setShowMessages] = useState(false);

  const loadMessages = useCallback(async () => {
    setIsLoadingMessages(true);
    try {
      const response = await api.get("/contact/my-messages");
      setMessages(response.data.contacts || []);
      setShowMessages(true);
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        "Failed to load your messages. Please try again.";
      toast.error(message);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const handleFormSuccess = () => {
    // Reload messages after successful submission
    loadMessages();
  };

  const getStatusColor = (status: "SUBMITTED" | "READ" | "RESOLVED") => {
    switch (status) {
      case "SUBMITTED":
        return "bg-blue-500/20 text-blue-300 border border-blue-500/30";
      case "READ":
        return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30";
      case "RESOLVED":
        return "bg-green-500/20 text-green-300 border border-green-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border border-gray-500/30";
    }
  };

  const getStatusLabel = (status: "SUBMITTED" | "READ" | "RESOLVED") => {
    switch (status) {
      case "SUBMITTED":
        return "Submitted";
      case "READ":
        return "Read";
      case "RESOLVED":
        return "Resolved";
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1120] to-[#0f172a] text-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <MessageSquare className="h-6 w-6 text-[#f5c518]" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Contact Us</h1>
          <p className="text-sm text-[#90a2bb] max-w-xl mx-auto leading-relaxed">
            Have questions or feedback? We're here to help. Send us a message
            and our team will get back to you as soon as possible.
          </p>
        </div> 

        <div className="space-y-6">
          <ContactForm
            userFullName={user?.fullName}
            userPhone={user?.phone}
            isLoggedIn={!!user}
            onSuccess={handleFormSuccess}
          />

          {/* Contact Info Card - Horizontal layout */}
          <div className="rounded-2xl border border-[#294157] bg-[linear-gradient(135deg,#111d2e_0%,#0f1a2a_100%)] p-5">
            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <p className="text-[10px] text-[#8a9bb0] uppercase font-bold tracking-wider mb-1">
                  Email Support
                </p>
                <a
                  href="mailto:support@betrixpro.com"
                  className="text-sm text-[#f5c518] hover:underline font-medium"
                >
                  support@betrixpro.com
                </a>
              </div>
              <div>
                <p className="text-[10px] text-[#8a9bb0] uppercase font-bold tracking-wider mb-1">
                  Phone Support
                </p>
                <a
                  href="tel:+254700000000"
                  className="text-sm text-[#f5c518] hover:underline font-medium"
                >
                  +254 700 000 000
                </a>
              </div>
              <div>
                <p className="text-[10px] text-[#8a9bb0] uppercase font-bold tracking-wider mb-1">
                  Our Location
                </p>
                <p className="text-sm text-[#90a2bb] font-medium">Nairobi, Kenya</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#294157]/50">
              <p className="text-xs text-[#8a9bb0] flex items-center gap-2">
                <span className="text-[#f5c518]">💡</span>
                We typically respond to messages within 24 hours during business days.
              </p>
            </div>
          </div>
        </div>

        {/* Message History Section */}
        <div className="mt-8">
          {!user ? (
            <div className="rounded-xl border border-[#294157] bg-[#0b1120]/50 p-4 text-center">
              <p className="text-xs text-[#8a9bb0]">
                💡 <span className="font-bold text-white uppercase tracking-tight">Login Required:</span> Message history and tracking can only be seen by logged in users.
              </p>
            </div>
          ) : (
            <>
              <button
                onClick={loadMessages}
                disabled={isLoadingMessages}
                className="inline-flex items-center gap-2 rounded-lg border border-[#294157] bg-[#0b1120] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#111d2e] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMessages ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#f5c518]" />
                    <span>Loading History...</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-3.5 w-3.5 text-[#f5c518]" />
                    <span>View Message History</span>
                  </>
                )}
              </button>

              {showMessages && messages.length > 0 && (
                <div className="mt-4">
                  <h2 className="text-lg font-bold text-white mb-3">
                    Your Messages ({messages.length})
                  </h2>
                  <div className="space-y-2">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className="rounded-xl border border-[#294157] bg-[#0f172a] p-3 hover:border-[#f5c518]/30 transition"
                      >
                        <div className="flex items-start justify-between gap-4 mb-1.5">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-white truncate">
                              {message.subject}
                            </h3>
                            <p className="text-[10px] text-[#8a9bb0]">
                              {formatDate(message.createdAt)}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap flex-shrink-0 ${getStatusColor(message.status)}`}
                          >
                            {getStatusLabel(message.status)}
                          </span>
                        </div>
                        <p className="text-xs text-[#90a2bb] line-clamp-2 leading-relaxed">
                          {message.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showMessages && messages.length === 0 && (
                <div className="mt-4 rounded-xl border border-[#294157] bg-[#0b1120] p-6 text-center">
                  <AlertCircle className="h-6 w-6 text-[#8a9bb0] mx-auto mb-2" />
                  <p className="text-sm text-[#90a2bb]">
                    You haven't sent any messages yet.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
