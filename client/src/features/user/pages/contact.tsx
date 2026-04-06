import { useAuth } from "@/context/AuthContext";
import { useCallback, useState } from "react";
import { MessageSquare, AlertCircle } from "lucide-react";
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
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <MessageSquare className="h-8 w-8 text-[#f5c518]" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
          <p className="text-base text-[#90a2bb] max-w-2xl mx-auto leading-relaxed">
            Have questions or feedback? We're here to help. Send us a message
            and our team will get back to you as soon as possible.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Contact Form - takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <ContactForm
              userFullName={user?.fullName}
              userPhone={user?.phone}
              isLoggedIn={!!user}
              onSuccess={handleFormSuccess}
            />
          </div>

          {/* Contact Info Card */}
          <div className="rounded-2xl border border-[#294157] bg-[linear-gradient(135deg,#111d2e_0%,#0f1a2a_100%)] p-6 h-fit">
            <h3 className="text-lg font-bold text-white mb-4">Get in Touch</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-[#8a9bb0] uppercase font-semibold mb-1">
                  Email
                </p>
                <a
                  href="mailto:support@betrixpro.com"
                  className="text-sm text-[#f5c518] hover:underline"
                >
                  support@betrixpro.com
                </a>
              </div>
              <div>
                <p className="text-xs text-[#8a9bb0] uppercase font-semibold mb-1">
                  Phone
                </p>
                <a
                  href="tel:+254700000000"
                  className="text-sm text-[#f5c518] hover:underline"
                >
                  +254 700 000 000
                </a>
              </div>
              <div>
                <p className="text-xs text-[#8a9bb0] uppercase font-semibold mb-1">
                  Location
                </p>
                <p className="text-sm text-[#90a2bb]">Nairobi, Kenya</p>
              </div>
              <div className="mt-6 p-3 rounded-lg bg-[#0b1120] border border-[#294157]">
                <p className="text-xs text-[#8a9bb0]">
                  💡 We typically respond to messages within 24 hours during
                  business days.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Message History Section */}
        <div className="mt-12">
          <button
            onClick={loadMessages}
            disabled={isLoadingMessages}
            className="inline-flex items-center gap-2 rounded-lg border border-[#294157] bg-[#0b1120] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#111d2e] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingMessages ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#f5c518] border-transparent border-t-[#f5c518]" />
                Loading...
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4" />
                View Message History
              </>
            )}
          </button>

          {showMessages && messages.length > 0 && (
            <div className="mt-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                Your Messages ({messages.length})
              </h2>
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="rounded-xl border border-[#294157] bg-[#0f172a] p-4 hover:border-[#f5c518]/30 transition"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-white truncate">
                          {message.subject}
                        </h3>
                        <p className="text-xs text-[#8a9bb0] mt-1">
                          {formatDate(message.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 ${getStatusColor(message.status)}`}
                      >
                        {getStatusLabel(message.status)}
                      </span>
                    </div>
                    <p className="text-sm text-[#90a2bb] line-clamp-2">
                      {message.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showMessages && messages.length === 0 && (
            <div className="mt-6 rounded-xl border border-[#294157] bg-[#0b1120] p-8 text-center">
              <AlertCircle className="h-8 w-8 text-[#8a9bb0] mx-auto mb-3" />
              <p className="text-[#90a2bb]">
                You haven't sent any messages yet. Use the form above to contact
                us.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
